import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { Video } from "./video";

import type { Content } from "@tiptap/core";

let editor: Editor | null = null;

function mount(content: Content = "<p></p>"): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: [StarterKit, Video],
    content,
  });
  return editor;
}

function videoNode(e: Editor): Record<string, unknown> | null {
  const found: Record<string, unknown>[] = [];
  e.state.doc.descendants((node) => {
    if (node.type.name === "video") found.push(node.attrs);
  });
  return found[0] ?? null;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

/**
 * `video` 节点此前没有任何测试。它与 `resizableImage` 一样在 schema 层接了媒体 URL
 * 白名单——UI 上传路径之外还有 `initialContent` 的 JSON/HTML、粘贴、宿主直接调
 * `setVideo()` 三条绕过途径，schema 是渲染前最后一道关。
 *
 * parse 与 render 两侧都要各自断言：只看 `getHTML()` 的话，render 侧的白名单会把输出
 * 洗干净，parse 侧即使整个失效也照样是绿的，而危险值这时已经进了 `getJSON()`。
 */
describe("video src 白名单（节点层）", () => {
  const DANGEROUS = [
    "javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
    "data:image/png;base64,AAA", // 图片类型的 data: 不能用于视频节点
  ];

  it.each(DANGEROUS)("命令插入的危险 src %s 不进入 attrs", (src) => {
    const e = mount();
    e.commands.setVideo({ src });
    expect(videoNode(e)?.src ?? null).toBeNull();
    expect(e.getHTML()).not.toContain(src);
  });

  it.each(DANGEROUS)("HTML 解析的危险 src %s 不进入 attrs / getJSON", (src) => {
    const e = mount(`<div><video src="${src}"></video></div>`);
    expect(videoNode(e)?.src ?? null).toBeNull();
    expect(JSON.stringify(e.getJSON())).not.toContain(src);
  });

  it.each([
    "https://cdn.example.com/a.mp4",
    "http://cdn.example.com/a.mp4",
    "/local/a.mp4",
    "data:video/mp4;base64,AAA",
  ])("合法 src %s 放行", (src) => {
    const e = mount();
    e.commands.setVideo({ src });
    expect(videoNode(e)?.src).toBe(src.startsWith("http") ? `${src}` : src);
  });

  it("HTML 往返后合法 src 不丢失", () => {
    const e = mount('<div><video src="https://cdn.example.com/a.mp4"></video></div>');
    expect(videoNode(e)?.src).toBe("https://cdn.example.com/a.mp4");
    expect(e.getHTML()).toContain("https://cdn.example.com/a.mp4");
  });
});
