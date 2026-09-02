import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, it, expect } from "vitest";

import { MathExtension } from "./MathExtension";

function makeEditor(content = "<p></p>") {
  return new Editor({ extensions: [StarterKit, MathExtension], content });
}

function roundTrip(editor: Editor): Editor {
  const next = makeEditor();
  next.commands.setContent(editor.getHTML());
  return next;
}

describe("MathExtension 序列化", () => {
  it("行内公式 HTML 往返不变", () => {
    const editor = makeEditor();
    editor.commands.insertInlineMath("a+b");
    const before = editor.getJSON();
    expect(roundTrip(editor).getJSON()).toEqual(before);
  });

  /**
   * 回归：块级公式曾被序列化成 `<p><div data-type="math"></div></p>`。
   * math 是 inline 节点，div 不是 phrasing content，HTML 解析器会在此处劈开 `<p>`，
   * 于是每存读一轮就多出两个空段落。
   */
  it("块级公式 HTML 往返不变，不产生空段落", () => {
    const editor = makeEditor();
    editor.commands.insertBlockMath("x^2");
    const before = editor.getJSON();

    const after = roundTrip(editor);
    expect(after.getJSON()).toEqual(before);
    expect(after.getJSON().content).toHaveLength(1);
  });

  it("块级公式反复往返不累积空段落", () => {
    const editor = makeEditor();
    editor.commands.insertBlockMath("x^2");
    const before = editor.getJSON();

    let current = editor;
    for (let i = 0; i < 4; i++) current = roundTrip(current);

    expect(current.getJSON()).toEqual(before);
  });

  it("句中插入块级公式不会把该段拦腰截断", () => {
    const editor = makeEditor("<p>before</p>");
    editor.commands.setTextSelection(3);
    editor.commands.insertBlockMath("y");
    const before = editor.getJSON();

    expect(roundTrip(editor).getJSON()).toEqual(before);
  });

  it("块级公式序列化为 span，并保留 data-block 与 math-block class", () => {
    const editor = makeEditor();
    editor.commands.insertBlockMath("x^2");
    const html = editor.getHTML();

    expect(html).not.toContain("<div");
    expect(html).toContain('data-block="true"');
    expect(html).toContain("math-block");
  });

  /** v0.2.0 之前落库的 div 形态仍要能读回成 math 节点 */
  it("仍能解析历史遗留的 div 形态", () => {
    const editor = makeEditor(
      '<div data-latex="x^2" data-block="true" data-type="math" class="math-node math-block"></div>',
    );
    const math = editor.getJSON().content?.[0]?.content?.[0];
    expect(math).toMatchObject({ type: "math", attrs: { latex: "x^2", block: true } });
  });
});
