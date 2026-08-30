import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { ResizableImage } from "./resizableImage";

import type { Content } from "@tiptap/core";

let editor: Editor | null = null;

function mount(content: Content = "<p></p>", enableResize = true): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: [
      StarterKit,
      ResizableImage.configure({ inline: true, allowBase64: true, enableResize }),
    ],
    content,
  });
  return editor;
}

function imageNode(e: Editor): Record<string, unknown> | null {
  const found: Record<string, unknown>[] = [];
  e.state.doc.descendants((node) => {
    if (node.type.name === "image") found.push(node.attrs);
  });
  return found[0] ?? null;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("src 白名单（节点层）", () => {
  it.each([
    "javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
  ])("危险 src %s 被剥离", (src) => {
    const e = mount();
    e.commands.setImage({ src });
    expect(e.getHTML()).not.toContain(src);
  });

  it("http / https / 相对路径 / 图片 data: 放行", () => {
    for (const src of [
      "https://cdn.example.com/a.png",
      "http://cdn.example.com/a.png",
      "/local/a.png",
      "data:image/png;base64,AAA",
    ]) {
      const e = mount();
      e.commands.setImage({ src });
      expect(e.getHTML(), src).toContain("<img");
      e.destroy();
    }
    editor = null;
  });

  it("从 HTML 粘贴的危险 src 同样被拦下", () => {
    const e = mount('<p><img src="javascript:alert(1)"></p>');
    expect(e.getHTML()).not.toContain("javascript:");
  });

  it("视频类型的 data: 不能用于图片节点", () => {
    const e = mount();
    e.commands.setImage({ src: "data:video/mp4;base64,AAA" });
    expect(e.getHTML()).not.toContain("data:video");
  });
});

describe("尺寸属性", () => {
  it("width / height 从 HTML 解析为数字", () => {
    const e = mount('<p><img src="https://x/a.png" width="320" height="240"></p>');
    const attrs = imageNode(e);

    expect(attrs?.width).toBe(320);
    expect(attrs?.height).toBe(240);
  });

  it("无尺寸时为 null，且不渲染空属性", () => {
    const e = mount('<p><img src="https://x/a.png"></p>');
    const attrs = imageNode(e);

    expect(attrs?.width).toBeNull();
    expect(attrs?.height).toBeNull();
    expect(e.getHTML()).not.toContain("width=");
  });

  it.each(["abc", "0", "-10", ""])("非法尺寸 %s 归一为 null，不产生 NaN", (raw) => {
    const e = mount(`<p><img src="https://x/a.png" width="${raw}"></p>`);
    const width = imageNode(e)?.width;

    expect(width).toBeNull();
    expect(Number.isNaN(width)).toBe(false);
  });

  it("尺寸渲染为内联 style", () => {
    const e = mount('<p><img src="https://x/a.png" width="100" height="50"></p>');
    const html = e.getHTML();

    expect(html).toContain("width: 100px");
    expect(html).toContain("height: 50px");
  });

  it("尺寸能从内联 style 解析回来（HTML 往返不丢尺寸）", () => {
    const e = mount('<p><img src="https://x/a.png" style="width: 320px; height: 240px"></p>');
    const attrs = imageNode(e);

    expect(attrs?.width).toBe(320);
    expect(attrs?.height).toBe(240);
  });
});

describe("对齐属性", () => {
  it.each(["left", "center", "right"])("data-align=%s 被解析", (align) => {
    const e = mount(`<p><img src="https://x/a.png" data-align="${align}"></p>`);
    expect(imageNode(e)?.align).toBe(align);
  });

  it("非法对齐值降级为 null", () => {
    const e = mount('<p><img src="https://x/a.png" data-align="diagonal"></p>');
    expect(imageNode(e)?.align).toBeNull();
  });

  it("从内联 style 的 text-align 推断", () => {
    const e = mount('<p><img src="https://x/a.png" style="text-align:center"></p>');
    expect(imageNode(e)?.align).toBe("center");
  });

  it("对齐写回 data-align", () => {
    const e = mount(`<p><img src="https://x/a.png" data-align="right"></p>`);
    expect(e.getHTML()).toContain('data-align="right"');
  });
});

describe("HTML 往返", () => {
  it("完整属性集往返后保持一致（尺寸不丢）", () => {
    const source =
      '<p><img src="https://x/a.png" width="200" height="100" data-align="center"></p>';
    const first = mount(source).getHTML();
    const second = mount(first);

    expect(second.getHTML()).toBe(first);
    expect(imageNode(second)?.width).toBe(200);
    expect(imageNode(second)?.height).toBe(100);
    expect(imageNode(second)?.align).toBe("center");
  });

  it("多次往返仍稳定", () => {
    let html = '<p><img src="https://x/a.png" width="200" height="100"></p>';
    for (let i = 0; i < 3; i++) {
      const e = mount(html);
      html = e.getHTML();
      expect(imageNode(e)?.width).toBe(200);
      e.destroy();
    }
    editor = null;
  });
});

describe("NodeView 挂载", () => {
  it("渲染出 img 元素", () => {
    const e = mount('<p><img src="https://x/a.png"></p>');
    expect(e.view.dom.querySelector("img")).not.toBeNull();
  });

  it("enableResize=false 时仍能正常渲染", () => {
    const e = mount('<p><img src="https://x/a.png"></p>', false);
    expect(e.view.dom.querySelector("img")).not.toBeNull();
  });
});
