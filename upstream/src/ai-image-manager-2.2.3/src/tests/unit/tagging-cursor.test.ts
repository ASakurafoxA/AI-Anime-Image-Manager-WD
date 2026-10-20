import { describe, expect, it } from "vitest";
import { shouldResetTaggingCursor } from "@/services/ai/tagging-cursor";

/**
 * 自用（需求 1）：打标"断点续跑 / 全库重跑"的核心判定。
 *
 * 这是对用户报的"建库中途退出后，再建库要从头开始"的回归保护：
 * 只要有游标（上次跑到一半），就绝不归零。
 */
describe("shouldResetTaggingCursor (自用需求 1)", () => {
  it("never resets when the caller did not ask for it (界面续跑路径)", () => {
    expect(
      shouldResetTaggingCursor(
        { resetCursor: false },
        { cursor: 5000, fullRunDone: false }
      )
    ).toBe(false);
    expect(
      shouldResetTaggingCursor(
        { resetCursor: false },
        { cursor: 0, fullRunDone: false }
      )
    ).toBe(false);
    expect(
      shouldResetTaggingCursor({}, { cursor: 5000, fullRunDone: false })
    ).toBe(false);
  });
});
