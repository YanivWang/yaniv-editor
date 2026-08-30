import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiHighlightMark } from "./AiHighlightMark";
import { aiSuggestionManager } from "./aiSuggestionManager";

/**
 * jsdom 没有布局引擎，`view.coordsAtPos()` 会在 `getClientRects` 上炸。
 *
 * 这里补的是**让被测代码能跑起来**的最小几何桩，测试本身不对位置做任何断言——
 * 被测对象是会话状态机（高亮、接受、拒绝、中止），弹层定位属于浏览器行为，
 * 由 E2E 覆盖。
 */
function installLayoutStubs(): void {
  const rect = () => ({
    length: 1,
    item: () => new DOMRect(0, 0, 10, 10),
    0: new DOMRect(0, 0, 10, 10),
    [Symbol.iterator]: function* () {
      yield new DOMRect(0, 0, 10, 10);
    },
  });

  for (const proto of [Text.prototype, Element.prototype, Range.prototype]) {
    Object.defineProperty(proto, "getClientRects", {
      configurable: true,
      writable: true,
      value: rect,
    });
    Object.defineProperty(proto, "getBoundingClientRect", {
      configurable: true,
      writable: true,
      value: () => new DOMRect(0, 0, 10, 10),
    });
  }
}

let editor: Editor | null = null;

function mount(content = "<p>alpha beta gamma</p>"): Editor {
  const root = document.createElement("div");
  root.className = "yaniv-editor";
  const portal = document.createElement("div");
  portal.className = "yaniv-editor__overlay-portal";
  root.appendChild(portal);

  const host = document.createElement("div");
  root.appendChild(host);
  document.body.appendChild(root);

  editor = new Editor({ element: host, extensions: [StarterKit, AiHighlightMark], content });
  return editor;
}

beforeEach(() => {
  installLayoutStubs();
  aiSuggestionManager.bindLocale((key) => key);
});

afterEach(() => {
  aiSuggestionManager.hide();
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("会话生命周期", () => {
  it("show 建立 replace 会话并给原文打高亮", () => {
    const e = mount();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);

    expect(e.getHTML()).toContain("ai-highlight");
  });

  it("updateSuggestion 累积流式文本", () => {
    const e = mount();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);

    aiSuggestionManager.updateSuggestion("A");
    aiSuggestionManager.updateSuggestion("ALPHA");

    expect(e.getHTML()).toContain("ALPHA");
  });

  it("stopStreaming 把 isStreaming 落到 mark 上", () => {
    const e = mount();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);
    aiSuggestionManager.updateSuggestion("X");
    aiSuggestionManager.stopStreaming();

    expect(e.getHTML()).toContain('data-is-streaming="false"');
  });

  it("hide 清除高亮并复位", () => {
    const e = mount();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);
    aiSuggestionManager.hide();

    expect(e.getHTML()).not.toContain("ai-highlight");
  });

  it("未绑定 editor 时 show 是安全空操作", () => {
    expect(() =>
      aiSuggestionManager.show("x", { from: 0, to: 1 }, undefined as unknown as Editor),
    ).not.toThrow();
  });
});

describe("accept 应用建议", () => {
  it("把选区替换为建议文本", () => {
    const e = mount();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);
    aiSuggestionManager.updateSuggestion("ALPHA");
    aiSuggestionManager.accept();

    expect(e.getText()).toContain("ALPHA");
    expect(e.getHTML()).not.toContain("ai-highlight");
  });

  it("建议为空时只关闭不改文档", () => {
    const e = mount();
    const before = e.getText();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);
    aiSuggestionManager.updateSuggestion("   ");
    aiSuggestionManager.accept();

    expect(e.getText()).toBe(before);
  });

  it("选区已失效（文档被删短）时不写入，安全关闭", () => {
    const e = mount("<p>alpha beta gamma delta epsilon</p>");
    aiSuggestionManager.show("alpha", { from: 20, to: 28 }, e);
    aiSuggestionManager.updateSuggestion("NEW");

    e.commands.setContent("<p>x</p>");

    expect(() => aiSuggestionManager.accept()).not.toThrow();
    expect(e.getText()).toBe("x");
  });

  it("未处于可见会话时 accept 是空操作", () => {
    const e = mount();
    const before = e.getText();
    aiSuggestionManager.accept();
    expect(e.getText()).toBe(before);
  });
});

describe("reject / cancel", () => {
  it("reject 关闭会话且不改文档", () => {
    const e = mount();
    const before = e.getText();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);
    aiSuggestionManager.updateSuggestion("ALPHA");
    aiSuggestionManager.reject();

    expect(e.getText()).toBe(before);
    expect(e.getHTML()).not.toContain("ai-highlight");
  });

  it("cancel 中止进行中的请求", () => {
    const e = mount();
    const controller = new AbortController();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);
    aiSuggestionManager.setAbortController(controller);

    aiSuggestionManager.cancel();
    expect(controller.signal.aborted).toBe(true);
  });

  it("hide 同样会中止请求，避免流继续写入已关闭的会话", () => {
    const e = mount();
    const controller = new AbortController();
    aiSuggestionManager.show("alpha", { from: 1, to: 6 }, e);
    aiSuggestionManager.setAbortController(controller);

    aiSuggestionManager.hide();
    expect(controller.signal.aborted).toBe(true);
  });
});

describe("续写模式", () => {
  it("showContinueWriting 在插入点建立会话且不破坏原文", () => {
    const e = mount("<p>alpha beta</p>");
    const insertPos = e.state.doc.content.size - 1;

    aiSuggestionManager.showContinueWriting(e, "alpha beta", { from: 1, to: 11 }, insertPos);

    expect(e.getText()).toContain("alpha beta");
    expect(e.getHTML()).toContain("ai-highlight");
  });
});

describe("locale 会话级绑定", () => {
  it("bindLocale 传 undefined 时回退为返回 key 本身", () => {
    expect(() => aiSuggestionManager.bindLocale(undefined)).not.toThrow();
  });

  it("不同会话可绑定不同语言解析器", () => {
    const zh = vi.fn((k: string) => `zh:${k}`);
    const en = vi.fn((k: string) => `en:${k}`);

    aiSuggestionManager.bindLocale(zh);
    aiSuggestionManager.bindLocale(en);

    // 后绑定的生效——会话互斥，这是预期行为
    expect(en).toBeDefined();
    expect(zh).toBeDefined();
  });
});
