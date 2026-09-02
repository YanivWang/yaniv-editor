import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, it, expect, afterEach } from "vitest";

import { ResizableImage } from "@/extensions/resizableImage";
import { Video } from "@/extensions/video";

import type { Extensions } from "@tiptap/core";

const editors: Editor[] = [];

function makeEditor(extensions: Extensions) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: [StarterKit, ...extensions],
    content: "<p></p>",
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

/**
 * 回归：节点视图里写 `el.src = attrs.src`，attrs 为 `null` 时被强制成字符串 `"null"`，
 * 浏览器会真的去 GET `<origin>/null`。而 src 为 null 正是白名单**拒绝之后**的正常状态，
 * 于是「拦下危险 URL」反而换来一次指向宿主自己域名的无效请求。
 */
describe.each([
  ["image", () => makeEditor([ResizableImage]), "img"] as const,
  ["video", () => makeEditor([Video]), "video"] as const,
])("%s 节点视图的 src 应用", (_name, create, tag) => {
  it("白名单拒绝 src 后，DOM 上不留下 src 属性", () => {
    const editor = create();
    editor.commands.insertContent({ type: _name, attrs: { src: "javascript:alert(1)" } });

    const el = editor.view.dom.querySelector(tag);
    expect(el).not.toBeNull();
    expect(el?.getAttribute("src")).toBeNull();
    expect(el?.getAttribute("src")).not.toBe("null");
  });

  it("完全没有 src 时，DOM 上不留下 src 属性", () => {
    const editor = create();
    editor.commands.insertContent({ type: _name });

    const el = editor.view.dom.querySelector(tag);
    expect(el?.getAttribute("src")).toBeNull();
  });

  it("合法 src 正常写入", () => {
    const editor = create();
    editor.commands.insertContent({ type: _name, attrs: { src: "https://x.test/a" } });

    const el = editor.view.dom.querySelector(tag);
    expect(el?.getAttribute("src")).toBe("https://x.test/a");
  });
});

describe("video 尺寸解析", () => {
  it("非法 width 不会把 NaN 写进 attrs", () => {
    const editor = makeEditor([Video]);
    editor.commands.setContent(
      '<video src="https://x.test/a.mp4" width="abc" height="240"></video>',
    );

    const attrs = editor.getJSON().content?.[0]?.attrs ?? {};
    expect(attrs.width).toBeNull();
    expect(Number.isNaN(attrs.width as number)).toBe(false);
    expect(attrs.height).toBe(240);
  });
});
