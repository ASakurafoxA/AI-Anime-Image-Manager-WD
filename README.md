# AI Anime Image Manager WD（原 LAN 版）

> **一句话**：本地动漫图库管理器 + 局域网/手机网页浏览：自动打 Danbooru 标签、标签中文化、以图搜图；全部本地运行。
>
> 基于上游 [Uyoung666/ai-image-manager](https://github.com/Uyoung666/ai-image-manager) v2.2.3（MIT，© 2025 Luan Roger）的**个人自用修改版**，与本仓库作者无关。

## 三个版本怎么选

| 版本 | 打标模型 | 局域网/手机 | 状态 |
|---|---|---|---|
| 本地版（`AI-Anime-Image-Manager`） | WD14（在安装包里） | 无 | **已冻结**（2026-10-18 最后一次更新） |
| **WD**（`AI-Anime-Image-Manager-WD`，2026-10-18 由 LAN 版改名） | WD14（在安装包里） | **有** | 持续维护 |
| **NEXT**（`AI-Anime-Image-Manager-NEXT`） | **PixAI Tagger v1.0**（和 NEXT 安装包放同一处） | **有** | 持续维护 |

> 三个版本的**语义搜索**都是中文 CLIP（在安装包里），**角色识别**都用 CCIP（外置模型，三版共用一份）。

## 怎么装（3 步）

1. **装本体**：双击 `AI Anime Image Manager WD-2.2.3-20261018.msi`（713 MB，WD14 模型已在包内），按向导走（会要管理员权限）；
2. **放模型**：**不用放模型**（WD14 和中文 CLIP 都在安装包里）
3. **打开**：开始菜单里的「AI Anime Image Manager WD」，先选一个图库文件夹（放你图片的目录）。

> 角色识别想用的话，再放一次 CCIP 模型：见 [CCIP模型安装说明.md](CCIP模型安装说明.md)。
> 局域网：设置 → 应用行为 → 局域网访问（开关 + 端口 + 口令）。

## 下载

| 内容 | 地址 |
|---|---|
| **安装包**（三个版本） | <https://pan.baidu.com/s/1jDBvv4tL9v5_BgYhRDJcGQ?pwd=6666> 提取码 `6666` |
| **PixAI 打标模型**（只有 NEXT 需要；和 **NEXT 的安装包**放在同一处） | <https://pan.baidu.com/s/1ZBRJIwIB7g1vuiTfoed4fA?pwd=6666> 提取码 `6666` |
| **CCIP 角色识别模型**（三版共用，339 MB，**单独一份**，不和 PixAI 打包在一起） | 见 [CCIP模型安装说明.md](CCIP模型安装说明.md) |

- 最新版与**历史版本**都在 [Releases](https://github.com/ASakurafoxA/AI-Anime-Image-Manager-WD/releases)（一版一个 tag，旧版不会被覆盖）；
- 模型文件的路径、SHA256、许可见 [MODELS.md](MODELS.md)。

## 更新了什么

见 [CHANGELOG.md](CHANGELOG.md)（最近一次：2026-10-18，新增角色识别、语义搜索换中文 CLIP）。

## 功能细节

[功能说明.md](功能说明.md) —— 打标、搜索、角色识别、整理、局域网，逐项说明。

## 自己构建

```powershell
npm install
node node_modules/@electron-forge/cli/dist/electron-forge.js make --targets @electron-forge/maker-wix
```

- 必须从**纯 ASCII、尽量短**的路径构建（中文/空格路径会让 WiX 失败；打包路径总长别超过 260 字符）；
- `package.json` 的 `description` 必须是**纯 ASCII**（MSI 数据库用 1252 代码页）；
- 详细约定见 [仓库维护规范.md](仓库维护规范.md)。

## 许可

本项目代码 **MIT**（保留上游版权声明，见 [LICENSE](LICENSE)）；第三方模型各自遵循其许可（中文 CLIP = MIT、WD14 = Apache-2.0、CCIP = MIT、PixAI 未核实 → 只自用不分发），详见 [MODELS.md](MODELS.md) 的许可表。
