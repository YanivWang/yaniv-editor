/**
 * 行高属性的默认值与挂载位置。
 */
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { LineHeight } from "./lineHeight";

describe("LineHeight", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const make = (content: string) => {
    const el = document.createElement("div");
    document.body.append(el);
    editor = new Editor({
      element: el,
      extensions: [StarterKit, TextStyle, LineHeight],
      content,
    });
    return editor;
  };

  it("没设过行高的段落不得被强加内联 line-height", () => {
    const e = make("<p>普通段落</p><h1>标题</h1>");
    expect(e.getHTML()).not.toMatch(/line-height/);
  });

  it("getJSON 里的 lineHeight 是 null，不是硬塞的具体值", () => {
    // ProseMirror 会把**声明过的**属性都列进 attrs，键本身去不掉；
    // 关键是值必须是 null —— 此前是 "1.5"，等于给宿主的每个段落塞了它从没设过的行高。
    const e = make("<p>普通段落</p>");
    const doc = e.getJSON() as { content: { attrs?: Record<string, unknown> }[] };
    expect(doc.content[0].attrs?.lineHeight).toBeNull();
  });

  it("解析外部 HTML 时保留已有行高、不给没有的补默认值", () => {
    const e = make('<p style="line-height: 2">有</p><p>没有</p>');
    const html = e.getHTML();
    expect(html).toMatch(/line-height:\s*2/);
    expect(html.match(/line-height/g)).toHaveLength(1);
  });

  it("显式设置后才输出内联样式", () => {
    const e = make("<p>段落</p>");
    e.commands.setTextSelection(2);
    e.commands.setLineHeight("2.5");
    expect(e.getHTML()).toMatch(/line-height:\s*2\.5/);
    e.commands.unsetLineHeight();
    expect(e.getHTML()).not.toMatch(/line-height/);
  });

  it("行高挂在段落节点上，不在 textStyle mark 上", () => {
    const e = make('<p style="line-height: 2">文字</p>');
    e.commands.setTextSelection({ from: 1, to: 3 });
    expect(e.getAttributes("paragraph").lineHeight).toBe("2");
    expect(e.getAttributes("textStyle").lineHeight).toBeUndefined();
  });
});
