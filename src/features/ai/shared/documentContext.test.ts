// @vitest-environment jsdom

/**
 * 文档全文会原样拼进 system prompt，不限长的话超长文档会把请求撑爆（多数模型返回 400）。
 *
 * 上限的单位是**字符**不是 token：项目同时支持 openai / aliyun / ollama 且模型可配，
 * 各家 tokenizer 不同，没有统一换算，所以默认值只能取一个保守估计，
 * 由宿主用 `aiConfig.documentContextLimit` 按实际模型调整。
 *
 * 截断**不能静默**——用户只会觉得「AI 这次答得不太行」，却不知道模型根本没看到全文。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { installBrowserStubs } from "@/testing/mountEditor";

import {
  buildDocumentContext,
  buildDocumentContextPrompt,
  DEFAULT_DOCUMENT_CONTEXT_LIMIT,
} from "./documentContext";
import { noticeDocumentContextTruncation } from "./runAiSuggestionStream";

beforeAll(installBrowserStubs);

const editors: Editor[] = [];

function editorWithText(text: string): Editor {
  const host = document.createElement("div");
  document.body.append(host);
  const editor = new Editor({
    element: host,
    extensions: [StarterKit],
    content: `<p>${text}</p>`,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

describe("buildDocumentContext", () => {
  it("短文档原样送出，不标记截断", () => {
    const editor = editorWithText("很短的一段文字");
    const context = buildDocumentContext(editor);

    expect(context.truncated).toBe(false);
    expect(context.keptChars).toBe(context.totalChars);
    expect(context.prompt).toContain("很短的一段文字");
    expect(context.prompt).not.toContain("节选");
  });

  it("超出上限时截断，并如实报告字符数", () => {
    const editor = editorWithText("字".repeat(500));
    const context = buildDocumentContext(editor, 100);

    expect(context.truncated).toBe(true);
    expect(context.keptChars).toBe(100);
    expect(context.totalChars).toBeGreaterThanOrEqual(500);
  });

  it("截断后的 prompt 带标记，让模型知道拿到的不是全文", () => {
    const editor = editorWithText("字".repeat(500));
    const context = buildDocumentContext(editor, 100);

    expect(context.prompt).toContain("节选");
  });

  it("恰好等于上限不截断（边界）", () => {
    const editor = editorWithText("字".repeat(50));
    const total = buildDocumentContext(editor).totalChars;
    const context = buildDocumentContext(editor, total);

    expect(context.truncated).toBe(false);
    expect(context.keptChars).toBe(total);
  });

  it("上限传 0 或负数表示不限长（宿主明确要关掉这个保护）", () => {
    const editor = editorWithText("字".repeat(500));

    for (const limit of [0, -1]) {
      const context = buildDocumentContext(editor, limit);
      expect(context.truncated, `limit=${limit}`).toBe(false);
      expect(context.keptChars, `limit=${limit}`).toBe(context.totalChars);
    }
  });

  it("默认上限是一个有限的正数——不限长正是这次要修的缺陷", () => {
    expect(DEFAULT_DOCUMENT_CONTEXT_LIMIT).toBeGreaterThan(0);
    expect(Number.isFinite(DEFAULT_DOCUMENT_CONTEXT_LIMIT)).toBe(true);
  });

  it("超过默认上限的文档会被默认配置截断", () => {
    const editor = editorWithText("字".repeat(DEFAULT_DOCUMENT_CONTEXT_LIMIT + 100));
    const context = buildDocumentContext(editor);

    expect(context.truncated).toBe(true);
    expect(context.keptChars).toBe(DEFAULT_DOCUMENT_CONTEXT_LIMIT);
  });
});

describe("buildDocumentContextPrompt 兼容既有调用方", () => {
  it("返回的就是 buildDocumentContext 的 prompt", () => {
    const editor = editorWithText("一些内容");
    expect(buildDocumentContextPrompt(editor)).toBe(buildDocumentContext(editor).prompt);
  });

  it("也接受上限参数", () => {
    const editor = editorWithText("字".repeat(500));
    expect(buildDocumentContextPrompt(editor, 100)).toContain("节选");
  });
});

/**
 * 截断必须让用户看见——这是选「可配置上限 + 明确提示」而不是「静默截断」的全部理由。
 */
describe("截断提示", () => {
  function editorInPortal(text: string): { editor: Editor; portal: HTMLElement } {
    const root = document.createElement("div");
    root.className = EDITOR_ROOT_CLASS;
    const portal = document.createElement("div");
    portal.className = OVERLAY_PORTAL_CLASS;
    root.append(portal);
    const host = document.createElement("div");
    root.append(host);
    document.body.append(root);

    const editor = new Editor({
      element: host,
      extensions: [StarterKit],
      content: `<p>${text}</p>`,
    });
    editors.push(editor);
    return { editor, portal };
  }

  const toasts = (portal: HTMLElement) =>
    [...portal.querySelectorAll(".ye-overlay-toast")].map((el) => el.textContent ?? "");

  it("截断时弹一条带实际字数的提示", () => {
    const { editor, portal } = editorInPortal("字".repeat(500));
    const context = buildDocumentContext(editor, 100);

    noticeDocumentContextTruncation(editor, context, (key) =>
      key === "messages.aiDocumentContextTruncated"
        ? "文档过长，仅取前 {kept} 字（共 {total} 字）"
        : key,
    );

    const shown = toasts(portal);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toContain("100");
    expect(shown[0]).toContain(String(context.totalChars));
    // 占位符必须被替换掉，不能把 {kept} 原样弹给用户
    expect(shown[0]).not.toContain("{kept}");
    expect(shown[0]).not.toContain("{total}");
  });

  it("没截断就不打扰用户", () => {
    const { editor, portal } = editorInPortal("短文本");
    const context = buildDocumentContext(editor, 10_000);

    noticeDocumentContextTruncation(editor, context, (key) => key);

    expect(toasts(portal)).toEqual([]);
  });

  it("编辑器已销毁时不抛错（流式回调里可能晚到）", () => {
    const { editor } = editorInPortal("字".repeat(500));
    const context = buildDocumentContext(editor, 100);
    editor.destroy();

    expect(() => noticeDocumentContextTruncation(editor, context, (key) => key)).not.toThrow();
  });
});
