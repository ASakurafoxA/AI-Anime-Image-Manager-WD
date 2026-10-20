/**
 * 动漫专用人脸检测器（deepghs/anime_face_detection face_detect_v1.4_s）评测。
 * 与现行 YuNet 在**同一批 200 张图**上直接对比。
 *
 * 用法：electron.exe scripts/anime-detect-probe.mjs <sample.json> <out.json> <modelDir>
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import sharp from "sharp";
import { normalizeImageInput } from "./face-image.mjs";
import { nmsBoxes } from "./face-yunet-postprocess.mjs";

const require = createRequire(import.meta.url);
const { InferenceSession, Tensor } = require("onnxruntime-node");

const [samplePath, outPath, modelDir] = process.argv.slice(2, 5);
const SIZE = 640;
const OFFICIAL = 0.307; // 模型自带 threshold.json: f1=0.95

const session = await InferenceSession.create(path.join(modelDir, "anime_face_detect", "model.onnx"), {
  executionProviders: ["cpu"],
  logSeverityLevel: 3,
});

const VARIANTS = [
  { name: "anime_lb", mode: "letterbox", conf: OFFICIAL, tiles: false },
  { name: "anime_lb_low", mode: "letterbox", conf: 0.15, tiles: false },
  { name: "anime_hybrid", mode: "letterbox", conf: OFFICIAL, tiles: true },
  { name: "anime_fill", mode: "fill", conf: OFFICIAL, tiles: false },
];

function tilesFor(w, h) {
  const k = Math.min(4, Math.max(1, Math.round(h / w)));
  const j = Math.min(3, Math.max(1, Math.round(w / h)));
  const out = [];
  const ov = 0.2;
  for (let r = 0; r < k; r++) {
    const th = h / k;
    const y0 = Math.max(0, Math.round(r * th - th * ov));
    const y1 = Math.min(h, Math.round((r + 1) * th + th * ov));
    for (let c = 0; c < j; c++) {
      const tw = w / j;
      const x0 = Math.max(0, Math.round(c * tw - tw * ov));
      const x1 = Math.min(w, Math.round((c + 1) * tw + tw * ov));
      out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
  }
  return out;
}

function cropTile(rgb, imgW, t) {
  const out = new Uint8Array(t.w * t.h * 3);
  for (let y = 0; y < t.h; y++) {
    const src = ((t.y + y) * imgW + t.x) * 3;
    out.set(rgb.subarray(src, src + t.w * 3), y * t.w * 3);
  }
  return out;
}

/** 一次推理：返回原始图坐标系下的框 */
async function detectOnce(rgb, w, h, mode, conf) {
  const buf = Buffer.from(rgb.buffer, rgb.byteOffset, rgb.byteLength);
  let px;
  let back;
  if (mode === "fill") {
    const { data } = await sharp(buf, { raw: { channels: 3, width: w, height: h } })
      .resize(SIZE, SIZE, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    px = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    back = (x, y) => [x * (w / SIZE), y * (h / SIZE)];
  } else {
    const scale = Math.min(SIZE / w, SIZE / h);
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));
    const padX = Math.floor((SIZE - nw) / 2);
    const padY = Math.floor((SIZE - nh) / 2);
    const { data } = await sharp(buf, { raw: { channels: 3, width: w, height: h } })
      .resize(nw, nh, { fit: "fill" })
      .extend({
        top: padY,
        bottom: SIZE - nh - padY,
        left: padX,
        right: SIZE - nw - padX,
        background: { r: 114, g: 114, b: 114 },
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    px = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    back = (x, y) => [(x - padX) / scale, (y - padY) / scale];
  }

  // YOLO 系输入：RGB, 0-1, NCHW
  const ppc = SIZE * SIZE;
  const f = new Float32Array(3 * ppc);
  for (let i = 0; i < ppc; i++) {
    f[i] = px[i * 3] / 255;
    f[ppc + i] = px[i * 3 + 1] / 255;
    f[2 * ppc + i] = px[i * 3 + 2] / 255;
  }
  const out = await session.run({ [session.inputNames[0]]: new Tensor("float32", f, [1, 3, SIZE, SIZE]) });
  const o = out[session.outputNames[0]];
  const dims = o.dims; // [1, 5, N]
  const N = dims[2];
  const anchors = 5;
  const cands = [];
  for (let i = 0; i < N; i++) {
    const score = o.data[4 * N + i];
    if (score < conf) continue;
    const cx = o.data[0 * N + i];
    const cy = o.data[1 * N + i];
    const bw = o.data[2 * N + i];
    const bh = o.data[3 * N + i];
    const [x1, y1] = back(cx - bw / 2, cy - bh / 2);
    const [x2, y2] = back(cx + bw / 2, cy + bh / 2);
    if (x2 - x1 <= 1 || y2 - y1 <= 1) continue;
    cands.push({ x1, y1, w: x2 - x1, h: y2 - y1, score });
  }
  const keep = nmsBoxes(cands, 0.5, 5000);
  return keep.map((i) => cands[i]);
}

const sample = JSON.parse(fs.readFileSync(samplePath, "utf-8"));
const results = [];
let done = 0;
const t0 = Date.now();
for (const item of sample) {
  const rec = { id: item.id, path: item.path, variants: {}, error: null };
  try {
    const img = await normalizeImageInput(item.path, item.path);
    for (const v of VARIANTS) {
      const s0 = Date.now();
      let raw = await detectOnce(img.data, img.width, img.height, v.mode, v.conf);
      const tiles = v.tiles ? tilesFor(img.width, img.height) : [];
      for (const t of tiles) {
        const sub = cropTile(img.data, img.width, t);
        const got = await detectOnce(sub, t.w, t.h, v.mode, v.conf);
        for (const g of got) raw.push({ ...g, x1: g.x1 + t.x, y1: g.y1 + t.y });
      }
      if (tiles.length) {
        const keep = nmsBoxes(raw, 0.5, 5000);
        raw = keep.map((i) => raw[i]);
      }
      rec.variants[v.name] = {
        count: raw.length,
        faces: raw.map((r) => ({
          x: Math.round(r.x1),
          y: Math.round(r.y1),
          width: Math.round(r.w),
          height: Math.round(r.h),
          confidence: r.score,
        })),
        ms: Date.now() - s0,
      };
    }
  } catch (err) {
    rec.error = err instanceof Error ? err.message : String(err);
  }
  results.push(rec);
  done++;
  if (done % 50 === 0) console.error(`[anime] ${done}/${sample.length} ${Math.round((Date.now() - t0) / 1000)}s`);
}

fs.writeFileSync(outPath, JSON.stringify({ variants: VARIANTS, results }, null, 1));
console.error(`[anime] 完成 ${results.length}，失败 ${results.filter((r) => r.error).length}，${Math.round((Date.now() - t0) / 1000)}s`);
for (const v of VARIANTS) {
  const cnt = results.filter((r) => (r.variants[v.name]?.count ?? 0) > 0).length;
  const tot = results.reduce((s, r) => s + (r.variants[v.name]?.count ?? 0), 0);
  const ms = results.map((r) => r.variants[v.name]?.ms ?? 0);
  console.error(
    `[anime] ${v.name.padEnd(14)} conf=${v.conf} | 有脸图 ${String(cnt).padStart(3)}/${results.length} (${((cnt / results.length) * 100).toFixed(1)}%) | 总脸数 ${String(tot).padStart(3)} | ${(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(0)}ms/图`
  );
}
console.error(`[anime] -> ${outPath}`);
