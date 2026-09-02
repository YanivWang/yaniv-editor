import { NodeSelection } from "@tiptap/pm/state";

import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export type ImageAlign = "left" | "center" | "right";

/** 会跟随 `setTextAlign` 的容器块 */
const ALIGNABLE_PARENTS = new Set(["paragraph", "heading"]);

/**
 * 给位于 `pos` 的图片设置对齐。
 *
 * 两步：先把**所在块**（段落 / 标题）整体设成该对齐，再把 `align` 写进图片节点自身
 * ——两者都要，因为图片可能被渲染成块级居中，也可能只是段落里的一个内联节点。
 *
 * 这段逻辑从 `ImageToolbar.vue` 里提出来，是为了让位置算术能被直接测到：
 * 选区终点必须是 `$pos.end(depth)`（父节点**内容**的末尾）。曾经写成
 * `$pos.start(depth) + parent.nodeSize`，而 `nodeSize` 含首尾两个标记、比
 * `content.size` 大 2，选区因此越过本段落伸进下一个块——给图片点一次对齐，
 * **后面那一段也被一起对齐**。
 */
export function applyImageAlign(editor: Editor, pos: number, align: ImageAlign): void {
  const $pos = editor.state.doc.resolve(pos);
  const parent = $pos.parent;

  if (ALIGNABLE_PARENTS.has(parent.type.name)) {
    editor
      .chain()
      .setTextSelection({ from: $pos.start($pos.depth), to: $pos.end($pos.depth) })
      .setTextAlign(align)
      .run();
  }

  editor.chain().focus().setNodeSelection(pos).updateAttributes("image", { align }).run();
}

/**
 * 找出当前选中（或光标紧邻）的图片及其文档位置。
 *
 * 位置一律由选区自身推出，**不**拿节点对象去全文搜身份：「复制块」用的是
 * `node.copy(node.content)`，副本与原块**共享同一批子节点实例**，于是文档里
 * 两处 image 会是同一个对象；再加上 `descendants` 的回调返回 `false` 只是
 * 「不再向下递归」而非「终止遍历」，按身份搜到的其实是**最后**一处——
 * 拖选恰好框住前一张图时（这时 `isActive("image")` 为真但选区不是 `NodeSelection`），
 * 对齐 / 预览会作用到后一张图上。
 */
export function findSelectedImage(editor: Editor | null | undefined): {
  node: ProseMirrorNode | null;
  pos: number | null;
} {
  if (!editor) return { node: null, pos: null };

  const { selection } = editor.state;

  // 节点选择：位置就是选区起点
  if (selection instanceof NodeSelection && selection.node.type.name === "image") {
    return { node: selection.node, pos: selection.from };
  }

  // 光标紧邻图片：nodeAfter 起于光标处，nodeBefore 止于光标处
  const { $anchor } = selection;
  const { nodeAfter, nodeBefore } = $anchor;

  if (nodeAfter?.type.name === "image") {
    return { node: nodeAfter, pos: $anchor.pos };
  }
  if (nodeBefore?.type.name === "image") {
    return { node: nodeBefore, pos: $anchor.pos - nodeBefore.nodeSize };
  }

  return { node: null, pos: null };
}
