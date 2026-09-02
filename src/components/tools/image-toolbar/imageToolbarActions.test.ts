import { Editor } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { ResizableImage } from "@/extensions/resizableImage";

import { applyImageAlign, findSelectedImage } from "./imageToolbarActions";

let editor: Editor | null = null;

function mount(content: string): Editor {
  editor = new Editor({
    extensions: [
      StarterKit,
      ResizableImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
  });
  return editor;
}

function imagePos(ed: Editor): number {
  let pos = -1;
  ed.state.doc.descendants((node, p) => {
    if (node.type.name === "image" && pos === -1) pos = p;
  });
  return pos;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("applyImageAlign", () => {
  it("只对齐图片所在的段落，不碰后面的段落", () => {
    const ed = mount('<p><img src="/a.png"></p><p>后面的段落</p>');
    applyImageAlign(ed, imagePos(ed), "right");

    const html = ed.getHTML();
    // 回归：终点曾用 `start + parent.nodeSize`（比内容末尾多 2），
    // 选区伸进下一个块，把后面那段也一起右对齐了。
    expect(html).toContain('<p style="text-align: right;"><img');
    expect(html).toContain("<p>后面的段落</p>");
  });

  it("同时把 align 写进图片节点自身", () => {
    const ed = mount('<p><img src="/a.png"></p>');
    applyImageAlign(ed, imagePos(ed), "center");

    let align: unknown = null;
    ed.state.doc.descendants((node) => {
      if (node.type.name === "image") align = node.attrs.align;
    });
    expect(align).toBe("center");
  });

  it("前后都有段落时也只影响中间那一段", () => {
    const ed = mount('<p>前面</p><p><img src="/a.png"></p><p>后面</p>');
    applyImageAlign(ed, imagePos(ed), "center");

    const html = ed.getHTML();
    expect(html).toContain("<p>前面</p>");
    expect(html).toContain("<p>后面</p>");
    expect(html.match(/text-align: center/g)).toHaveLength(1);
  });

  it("父节点不是段落 / 标题时只改节点属性", () => {
    const ed = mount('<blockquote><p><img src="/a.png"></p></blockquote><p>后面</p>');
    const pos = imagePos(ed);
    applyImageAlign(ed, pos, "right");

    expect(ed.getHTML()).toContain("<p>后面</p>");
  });
});

describe("findSelectedImage", () => {
  it("节点选择时返回选区起点", () => {
    const ed = mount('<p>前</p><p><img src="/a.png"></p>');
    const pos = imagePos(ed);
    ed.commands.setNodeSelection(pos);

    expect(findSelectedImage(ed)).toMatchObject({ pos });
  });

  it("光标在图片之后时返回图片自身的位置", () => {
    const ed = mount('<p><img src="/a.png"></p>');
    const pos = imagePos(ed);
    ed.commands.setTextSelection(pos + 1);

    expect(findSelectedImage(ed).pos).toBe(pos);
  });

  it("光标在图片之前时返回图片自身的位置", () => {
    const ed = mount('<p><img src="/a.png"></p>');
    const pos = imagePos(ed);
    ed.commands.setTextSelection(pos);

    expect(findSelectedImage(ed).pos).toBe(pos);
  });

  /**
   * 回归：「复制块」走 `node.copy(node.content)`，副本与原块共享同一批子节点实例，
   * 文档里两处 image 于是是同一个对象。此前用 `descendants` 按身份反查位置，
   * 命中的是**最后**一处（回调返回 false 只是不再向下递归，并不终止遍历），
   * 光标停在前一张图旁边时会操作到后一张图。
   */
  it("重复块共享节点实例时仍返回光标处那一张", () => {
    const ed = mount('<p><img src="/a.png"></p>');

    // 复刻 duplicateTargetNode 的做法
    const { state } = ed;
    let paraPos = -1;
    let para: ReturnType<typeof state.doc.child> | null = null;
    state.doc.descendants((node, p) => {
      if (node.type.name === "paragraph" && paraPos === -1) {
        paraPos = p;
        para = node;
      }
    });
    const source = para as unknown as {
      copy: (c: unknown) => never;
      content: unknown;
      nodeSize: number;
    };
    ed.view.dispatch(state.tr.insert(paraPos + source.nodeSize, source.copy(source.content)));

    const positions: number[] = [];
    const nodes: unknown[] = [];
    ed.state.doc.descendants((node, p) => {
      if (node.type.name === "image") {
        positions.push(p);
        nodes.push(node);
      }
    });
    // 前提成立：两处确实是同一个对象，否则这条回归就没在测该场景
    expect(nodes[0]).toBe(nodes[1]);
    expect(positions).toHaveLength(2);

    ed.commands.setTextSelection(positions[0] + 1);
    expect(findSelectedImage(ed).pos).toBe(positions[0]);
  });

  it("光标不挨着图片时返回空", () => {
    const ed = mount("<p>纯文本</p>");
    ed.commands.setTextSelection(2);

    expect(findSelectedImage(ed)).toEqual({ node: null, pos: null });
  });

  it("editor 为空时返回空", () => {
    expect(findSelectedImage(null)).toEqual({ node: null, pos: null });
  });
});
