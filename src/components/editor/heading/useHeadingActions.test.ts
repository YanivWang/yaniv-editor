/**
 * 两个设标题入口必须走同一条路径。
 *
 * 按钮组用 `toggleHeadingLevel`、下拉用 `setHeadingValue`，
 * 此前前者是裸 `toggleHeading`，少了后者的「清掉 textStyle」一步：
 * 同一个「设为 H2」，按钮做出来是 `<h2><span style="font-size: 28px">…</span></h2>`
 * ——残留字号盖过标题自己的字号，下拉做出来才是干净的 `<h2>`。
 */
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { FontSize } from "@/extensions/fontSize";

import { useHeadingActions } from "./useHeadingActions";

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

const make = (content = '<p><span style="font-size: 28px">带字号的文字</span></p>') => {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({
    element: el,
    extensions: [StarterKit, TextStyle, FontSize],
    content,
  });
  editor.commands.setTextSelection({ from: 1, to: 7 });
  return editor;
};

describe("useHeadingActions", () => {
  it("按钮入口与下拉入口产出相同的 HTML", () => {
    const a = make();
    useHeadingActions(() => a).toggleHeadingLevel(2)();
    const viaButton = a.getHTML();
    a.destroy();
    editor = null;

    const b = make();
    useHeadingActions(() => b).setHeadingValue("h2");
    const viaDropdown = b.getHTML();

    expect(viaButton).toBe(viaDropdown);
  });

  it("设为标题时清掉 textStyle，残留字号不得盖过标题字号", () => {
    const e = make();
    useHeadingActions(() => e).toggleHeadingLevel(2)();
    expect(e.getHTML()).toContain("<h2>");
    expect(e.getHTML()).not.toMatch(/font-size/);
  });

  it("再点同一级别切回段落（保持 toggle 语义）", () => {
    const e = make("<p>普通文字</p>");
    const actions = useHeadingActions(() => e);
    actions.toggleHeadingLevel(2)();
    expect(e.getHTML()).toContain("<h2>");
    actions.toggleHeadingLevel(2)();
    expect(e.getHTML()).toContain("<p>");
    expect(e.getHTML()).not.toContain("<h2>");
  });

  it("切到别的级别不会误切回段落", () => {
    const e = make("<p>普通文字</p>");
    const actions = useHeadingActions(() => e);
    actions.toggleHeadingLevel(2)();
    actions.toggleHeadingLevel(3)();
    expect(e.getHTML()).toContain("<h3>");
  });

  it("非法级别值被挡下", () => {
    const e = make("<p>普通文字</p>");
    useHeadingActions(() => e).setHeadingValue("h9");
    expect(e.getHTML()).toContain("<p>");
  });
});
