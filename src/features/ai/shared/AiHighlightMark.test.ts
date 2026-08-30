import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AiHighlightMark,
  addAiHighlight,
  getAiSuggestionData,
  removeAiHighlight,
  updateAiHighlight,
} from "./AiHighlightMark";

import type { AnyExtension } from "@tiptap/core";

let editor: Editor | null = null;

function mount(withMark = true, content = "<p>alpha beta gamma</p>"): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const extensions: AnyExtension[] = withMark ? [StarterKit, AiHighlightMark] : [StarterKit];
  editor = new Editor({ element, extensions, content });
  return editor;
}

const DATA = { originalText: "alpha", suggestedText: "ALPHA", isStreaming: true };

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("addAiHighlight", () => {
  it("给指定区间打上高亮 mark 与建议数据", () => {
    const e = mount();
    addAiHighlight(e, 1, 6, DATA);

    const html = e.getHTML();
    expect(html).toContain("ai-highlight");
    expect(html).toContain('data-original-text="alpha"');
  });

  it("不传数据时也能只加高亮", () => {
    const e = mount();
    addAiHighlight(e, 1, 6);
    expect(e.getHTML()).toContain("ai-highlight");
  });

  it("schema 缺少 aiHighlight 时告警并跳过", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const e = mount(false);

    addAiHighlight(e, 1, 6, DATA);

    expect(warn).toHaveBeenCalled();
    expect(e.getHTML()).not.toContain("ai-highlight");
  });

  it("越界区间被拒绝并告警", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const e = mount();

    addAiHighlight(e, 0, 9999, DATA);

    expect(warn).toHaveBeenCalled();
  });

  it("from 等于 to 的空区间不产生 mark", () => {
    const e = mount();
    addAiHighlight(e, 3, 3, DATA);
    expect(e.getHTML()).not.toContain("ai-highlight");
  });
});

describe("updateAiHighlight", () => {
  it("流式过程中就地更新建议文本", () => {
    const e = mount();
    addAiHighlight(e, 1, 6, DATA);

    updateAiHighlight(e, 1, 6, { suggestedText: "ALPHA-v2", isStreaming: false });

    const html = e.getHTML();
    expect(html).toContain("ALPHA-v2");
    // 原文保留，只覆盖传入字段
    expect(html).toContain('data-original-text="alpha"');
  });

  it("区间上没有 mark 时静默返回", () => {
    const e = mount();
    expect(() => updateAiHighlight(e, 1, 6, { suggestedText: "x" })).not.toThrow();
  });

  it("schema 缺少 mark 时告警", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    updateAiHighlight(mount(false), 1, 6, { suggestedText: "x" });
    expect(warn).toHaveBeenCalled();
  });

  it("越界区间告警且不抛错", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    updateAiHighlight(mount(), 0, 9999, { suggestedText: "x" });
    expect(warn).toHaveBeenCalled();
  });
});

describe("removeAiHighlight", () => {
  it("清除全文中的高亮", () => {
    const e = mount();
    addAiHighlight(e, 1, 6, DATA);
    expect(e.getHTML()).toContain("ai-highlight");

    removeAiHighlight(e);
    expect(e.getHTML()).not.toContain("ai-highlight");
  });

  it("没有高亮时是安全空操作", () => {
    const e = mount();
    expect(() => removeAiHighlight(e)).not.toThrow();
  });
});

describe("getAiSuggestionData", () => {
  it("读回写入的建议数据", () => {
    const e = mount();
    addAiHighlight(e, 1, 6, DATA);

    const data = getAiSuggestionData(e, 2);
    expect(data?.originalText).toBe("alpha");
    expect(data?.suggestedText).toBe("ALPHA");
  });

  it("位置上没有高亮时返回 null", () => {
    const e = mount();
    addAiHighlight(e, 1, 6, DATA);
    expect(getAiSuggestionData(e, 15)).toBeNull();
  });

  it.each([9999, -1, Number.NaN])("越界 / 非法位置 %s 返回 null 而不是抛 RangeError", (pos) => {
    const e = mount();
    expect(() => getAiSuggestionData(e, pos)).not.toThrow();
    expect(getAiSuggestionData(e, pos)).toBeNull();
  });

  it("文档被删短后，过期位置不再导致崩溃", () => {
    const e = mount(true, "<p>alpha beta gamma delta</p>");
    addAiHighlight(e, 1, 6, DATA);
    const stalePos = e.state.doc.content.size - 1;

    e.commands.setContent("<p>x</p>");

    expect(() => getAiSuggestionData(e, stalePos)).not.toThrow();
  });
});

describe("命令式 API", () => {
  it("setAiHighlight / unsetAiHighlight 作用于当前选区", () => {
    const e = mount();
    e.commands.setTextSelection({ from: 1, to: 6 });

    e.commands.setAiHighlight(DATA);
    expect(e.getHTML()).toContain("ai-highlight");

    e.commands.unsetAiHighlight();
    expect(e.getHTML()).not.toContain("ai-highlight");
  });
});

describe("HTML 往返", () => {
  it("高亮属性可从 HTML 解析回来", () => {
    const e = mount();
    addAiHighlight(e, 1, 6, DATA);
    const html = e.getHTML();

    const e2 = mount(true, html);
    expect(getAiSuggestionData(e2, 2)?.originalText).toBe("alpha");
  });
});
