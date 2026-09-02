// @vitest-environment jsdom

/**
 * AI 流的句柄交接：换流之后，谁还能取消谁。
 *
 * `aiSuggestionManager` 是模块级单例，只存**一个** `AbortController`。
 * 换流的时序是「新流 setAbortController → 旧流被 abort → 旧流的 fetch 以 AbortError
 * 走 onError → 旧流在那里清句柄」——清的时候句柄已经是新流的了，所以清理必须按身份。
 *
 * 这里走 `runAiSuggestionStream` 真实入口（不手工模拟调用链，方法论 12），
 * 用一个只把回调存下来的假 stream 控制时序。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import { AiHighlightMark } from "./AiHighlightMark";
import { aiSuggestionManager } from "./aiSuggestionManager";
import { runAiSuggestionStream } from "./runAiSuggestionStream";

import type { AiStreamCallbacks } from "../types";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

const editors: Editor[] = [];

function createEditor(): Editor {
  const root = document.createElement("div");
  root.className = "yaniv-editor";
  const portal = document.createElement("div");
  portal.className = "yaniv-editor__overlay-portal";
  const host = document.createElement("div");
  root.append(portal, host);
  document.body.append(root);

  const editor = new Editor({
    element: host,
    extensions: [StarterKit, AiHighlightMark],
    content: "<p>一二三四五六</p>",
  });
  editors.push(editor);
  return editor;
}

function abortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

afterEach(() => {
  aiSuggestionManager.hide();
  while (editors.length) {
    const editor = editors.pop();
    if (editor && !editor.isDestroyed) editor.destroy();
  }
  document.body.innerHTML = "";
});

describe("换流后的取消能力", () => {
  it("旧流的 AbortError 不得清掉新流的句柄", () => {
    const editor = createEditor();
    const captured: AiStreamCallbacks[] = [];
    const stream = (_content: string, _sys: string, callbacks: AiStreamCallbacks) => {
      captured.push(callbacks);
    };

    runAiSuggestionStream(editor, "一二", { from: 1, to: 3 }, stream, "润色失败");
    runAiSuggestionStream(editor, "三四", { from: 3, to: 5 }, stream, "润色失败");

    const [first, second] = captured;
    expect(first.signal!.aborted, "换流时旧流应被取消").toBe(true);
    expect(second.signal!.aborted).toBe(false);

    // 旧流的 fetch 随后以 AbortError 回调——它清的必须是自己那个句柄
    first.onError!(abortError());

    aiSuggestionManager.cancel();

    expect(second.signal!.aborted, "用户点取消时，正在跑的新流必须被停掉").toBe(true);
  });

  it("旧流的 onComplete 晚于新流启动时，也不得清掉新流的句柄", () => {
    const editor = createEditor();
    const captured: AiStreamCallbacks[] = [];
    const stream = (_content: string, _sys: string, callbacks: AiStreamCallbacks) => {
      captured.push(callbacks);
    };

    runAiSuggestionStream(editor, "一二", { from: 1, to: 3 }, stream, "润色失败");
    captured[0].onStart?.();
    captured[0].onToken?.("润色结果");

    // 换流：数据已经全部到达、收尾回调还排在队列里时，用户又发起了一次
    runAiSuggestionStream(editor, "三四", { from: 3, to: 5 }, stream, "润色失败");
    const second = captured[1];

    captured[0].onComplete!("润色结果");

    aiSuggestionManager.cancel();
    expect(second.signal!.aborted, "旧流收尾不该带走新流的取消能力").toBe(true);
  });

  it("流正常结束时把建议文本交给单例", () => {
    const editor = createEditor();
    const captured: AiStreamCallbacks[] = [];
    const stream = (_content: string, _sys: string, callbacks: AiStreamCallbacks) => {
      captured.push(callbacks);
    };

    runAiSuggestionStream(editor, "一二", { from: 1, to: 3 }, stream, "润色失败");
    captured[0].onStart?.();
    captured[0].onToken?.("润色结果");
    captured[0].onComplete!("润色结果");

    expect(aiSuggestionManager.getState().suggestedText).toBe("润色结果");
  });

  it("非 AbortError 走提示路径，同样只清自己的句柄", () => {
    const editor = createEditor();
    const captured: AiStreamCallbacks[] = [];
    const stream = (_content: string, _sys: string, callbacks: AiStreamCallbacks) => {
      captured.push(callbacks);
    };

    runAiSuggestionStream(editor, "一二", { from: 1, to: 3 }, stream, "润色失败");
    runAiSuggestionStream(editor, "三四", { from: 3, to: 5 }, stream, "润色失败");

    captured[0].onError!(new Error("网络错误"));

    aiSuggestionManager.cancel();
    expect(captured[1].signal!.aborted, "新流仍要能被取消").toBe(true);
  });

  it("累积 token 而不是覆盖，onStart 重置上一轮的残留", () => {
    const editor = createEditor();
    const captured: AiStreamCallbacks[] = [];
    const stream = (_content: string, _sys: string, callbacks: AiStreamCallbacks) => {
      captured.push(callbacks);
    };

    runAiSuggestionStream(editor, "一二", { from: 1, to: 3 }, stream, "润色失败");
    const callbacks = captured[0];

    callbacks.onStart?.();
    callbacks.onToken?.("润");
    callbacks.onToken?.("色");
    callbacks.onToken?.("结果");

    expect(aiSuggestionManager.getState().suggestedText).toBe("润色结果");

    callbacks.onStart?.();
    callbacks.onToken?.("重来");
    expect(aiSuggestionManager.getState().suggestedText).toBe("重来");
  });

  it("空 token 不触发一次多余的建议更新", () => {
    const editor = createEditor();
    const captured: AiStreamCallbacks[] = [];
    const stream = (_content: string, _sys: string, callbacks: AiStreamCallbacks) => {
      captured.push(callbacks);
    };

    runAiSuggestionStream(editor, "一二", { from: 1, to: 3 }, stream, "润色失败");
    const callbacks = captured[0];
    callbacks.onStart?.();

    /**
     * 空 token 后文本没变化，只看 `suggestedText` 分不出「跳过了」和「照样更新了一遍」
     * ——那样的断言恒真。这里数的是 `updateSuggestion` 的调用次数：每一次都会写响应式
     * 状态并重绘高亮，SSE 心跳帧带来的空 token 不该产生这些开销。
     */
    const original = aiSuggestionManager.updateSuggestion.bind(aiSuggestionManager);
    let calls = 0;
    aiSuggestionManager.updateSuggestion = (text: string) => {
      calls += 1;
      original(text);
    };

    try {
      callbacks.onToken?.("润");
      callbacks.onToken?.("");
      callbacks.onToken?.("色");
      expect(calls, "两个非空 token 应只更新两次").toBe(2);
      expect(aiSuggestionManager.getState().suggestedText).toBe("润色");
    } finally {
      aiSuggestionManager.updateSuggestion = original;
    }
  });
});
