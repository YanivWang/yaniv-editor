/**
 * 换流时必须取消上一个流。
 *
 * `aiSuggestionManager` 是模块级单例，`setAbortController` 此前直接覆盖：
 * 同一个编辑器上连做两次 AI 操作时 `show()` 不会 abort（`ensureEditor` 对同一实例
 * 直接返回），第一个流的 controller 被覆盖后再也无人能取消——它继续消耗 API 配额，
 * `onToken` 还在往同一个单例里 `updateSuggestion()`，两个流的文本互相覆盖。
 */
import { describe, expect, it } from "vitest";

import { aiSuggestionManager } from "./aiSuggestionManager";

describe("setAbortController 的接管语义", () => {
  it("换成另一个 controller 时取消上一个", () => {
    const first = new AbortController();
    const second = new AbortController();

    aiSuggestionManager.setAbortController(first);
    expect(first.signal.aborted).toBe(false);

    aiSuggestionManager.setAbortController(second);
    expect(first.signal.aborted, "第一个流应被取消").toBe(true);
    expect(second.signal.aborted, "新流不该被取消").toBe(false);

    aiSuggestionManager.setAbortController(null);
  });

  it("传 null 是「流已结束」，不该 abort", () => {
    const controller = new AbortController();
    aiSuggestionManager.setAbortController(controller);
    aiSuggestionManager.setAbortController(null);
    expect(controller.signal.aborted).toBe(false);
  });

  it("重复传同一个 controller 不自我取消", () => {
    const controller = new AbortController();
    aiSuggestionManager.setAbortController(controller);
    aiSuggestionManager.setAbortController(controller);
    expect(controller.signal.aborted).toBe(false);
    aiSuggestionManager.setAbortController(null);
  });
});
