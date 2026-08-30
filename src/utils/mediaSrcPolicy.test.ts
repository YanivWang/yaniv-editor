import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { ContentAdapter } from "@/core/session/contentAdapter";
import { ResizableImage } from "@/extensions/resizableImage";
import { Video } from "@/extensions/video";

import { sanitizeMediaSrcAttrs } from "./mediaSrcPolicy";

import type { Content } from "@tiptap/core";

let editor: Editor | null = null;

function mount(content: Content = "<p></p>"): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: [StarterKit, ResizableImage.configure({ inline: true, allowBase64: true }), Video],
    content,
  });
  return editor;
}

function srcOf(e: Editor, type: string): unknown {
  let out: unknown = "<node not found>";
  e.state.doc.descendants((node) => {
    if (node.type.name === type) out = node.attrs.src;
  });
  return out;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

const DANGEROUS = "javascript:alert(1)";

describe("sanitizeMediaSrcAttrs", () => {
  it("媒体节点的危险 src 置为 null", () => {
    expect(sanitizeMediaSrcAttrs("image", { src: DANGEROUS })).toEqual({ src: null });
    expect(sanitizeMediaSrcAttrs("video", { src: DANGEROUS })).toEqual({ src: null });
  });

  it("按节点类型区分 data: 前缀", () => {
    expect(sanitizeMediaSrcAttrs("image", { src: "data:image/png;base64,AAA" })).toEqual({
      src: "data:image/png;base64,AAA",
    });
    expect(sanitizeMediaSrcAttrs("video", { src: "data:image/png;base64,AAA" })).toEqual({
      src: null,
    });
  });

  it("非媒体节点与合格 src 原样返回同一对象（不做无谓拷贝）", () => {
    const paragraphAttrs = { src: DANGEROUS };
    expect(sanitizeMediaSrcAttrs("paragraph", paragraphAttrs)).toBe(paragraphAttrs);

    const okAttrs = { src: "https://cdn.example.com/a.png" };
    expect(sanitizeMediaSrcAttrs("image", okAttrs)).toBe(okAttrs);
  });

  it("空 src / 无 attrs 不报错", () => {
    expect(sanitizeMediaSrcAttrs("image", undefined)).toBeUndefined();
    expect(sanitizeMediaSrcAttrs("image", {})).toEqual({});
    expect(sanitizeMediaSrcAttrs("image", { src: "" })).toEqual({ src: "" });
  });
});

/**
 * 四条入口逐一验证。此前只有 HTML 一条被 `parseHTML` 覆盖，
 * 另外三条把危险值直接写进 attrs——`getHTML()` 因为 `renderHTML` 也过白名单而看不出来，
 * 但 `getJSON()` 会原样交给宿主。
 */
describe("媒体 src 白名单覆盖全部入口", () => {
  it("入口 1：HTML 字符串", () => {
    const e = mount(`<p><img src="${DANGEROUS}"></p>`);
    expect(srcOf(e, "image")).toBeNull();
  });

  /**
   * `initialContent` 的真实链路是 `useEditorSession` → `prepareEditorContent` →
   * `new Editor({ content })`，因此这里走同一个漏斗，而不是直接把裸 JSON 丢给 Editor。
   */
  it("入口 2：JSON initialContent（经 prepareEditorContent）", () => {
    const extensions = [
      StarterKit,
      ResizableImage.configure({ inline: true, allowBase64: true }),
      Video,
    ];
    const prepared = ContentAdapter.prepareEditorContent(
      {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "image", attrs: { src: DANGEROUS } }] },
          { type: "video", attrs: { src: DANGEROUS } },
        ],
      },
      extensions,
    );

    expect(JSON.stringify(prepared)).not.toContain(DANGEROUS);

    const e = mount(prepared);
    expect(srcOf(e, "image")).toBeNull();
    expect(srcOf(e, "video")).toBeNull();
    expect(JSON.stringify(e.getJSON())).not.toContain(DANGEROUS);
  });

  it("入口 3：ContentAdapter.setContent 传 JSON", () => {
    const e = mount("<p></p>");
    ContentAdapter.setContent(e, {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "image", attrs: { src: DANGEROUS } }] }],
    });
    expect(srcOf(e, "image")).toBeNull();
    expect(JSON.stringify(e.getJSON())).not.toContain(DANGEROUS);
  });

  it("入口 4：setImage / setVideo 命令", () => {
    const e = mount("<p></p>");
    e.commands.setImage({ src: DANGEROUS });
    expect(srcOf(e, "image")).toBeNull();

    e.commands.setVideo({ src: DANGEROUS });
    expect(srcOf(e, "video")).toBeNull();
    expect(JSON.stringify(e.getJSON())).not.toContain(DANGEROUS);
  });

  it("入口 4b：insertContent 直接塞节点 JSON", () => {
    const e = mount("<p></p>");
    e.commands.insertContent({ type: "image", attrs: { src: DANGEROUS } });
    expect(srcOf(e, "image")).toBeNull();
    expect(JSON.stringify(e.getJSON())).not.toContain(DANGEROUS);
  });

  it("合法 src 在所有入口都不受影响", () => {
    const ok = "https://cdn.example.com/a.png";
    const e = mount("<p></p>");
    e.commands.setImage({ src: ok });
    expect(srcOf(e, "image")).toBe(ok);
    expect(e.getHTML()).toContain(ok);
  });

  it("补偿事务不进 history —— 撤销不会把危险值撤回来", () => {
    const e = mount("<p>seed</p>");
    e.commands.setImage({ src: DANGEROUS });
    expect(srcOf(e, "image")).toBeNull();

    e.commands.undo();
    expect(JSON.stringify(e.getJSON())).not.toContain(DANGEROUS);
  });
});
