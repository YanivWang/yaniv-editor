import { Fragment, type Node as ProseMirrorNode, type Schema } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

import type { BlockInsertContext, BlockMenuItemId } from "./types";
import type { Editor } from "@tiptap/core";

function createInlineContent(schema: Schema, text: string): Fragment | null {
  return text.trim().length > 0 ? Fragment.from(schema.text(text)) : null;
}

function createParagraph(schema: Schema, text = ""): ProseMirrorNode {
  return schema.nodes.paragraph.create(null, createInlineContent(schema, text));
}

function createHeading(schema: Schema, level: 1 | 2 | 3, text = ""): ProseMirrorNode {
  return schema.nodes.heading.create({ level }, createInlineContent(schema, text));
}

function createCodeBlock(schema: Schema, text = ""): ProseMirrorNode {
  return schema.nodes.codeBlock.create(null, createInlineContent(schema, text));
}

function createBlockquote(schema: Schema, text = ""): ProseMirrorNode {
  return schema.nodes.blockquote.create(null, createParagraph(schema, text));
}

function createList(
  schema: Schema,
  type: "bulletList" | "orderedList" | "taskList",
  text = "",
): ProseMirrorNode {
  const listType = schema.nodes[type];
  const itemType = type === "taskList" ? schema.nodes.taskItem : schema.nodes.listItem;
  const attrs = type === "taskList" ? { checked: false } : null;

  return listType.create(null, itemType.create(attrs, createParagraph(schema, text)));
}

function createNodeForInsert(schema: Schema, blockId: BlockMenuItemId): ProseMirrorNode | null {
  switch (blockId) {
    case "paragraph":
      return createParagraph(schema);
    case "heading1":
      return createHeading(schema, 1);
    case "heading2":
      return createHeading(schema, 2);
    case "heading3":
      return createHeading(schema, 3);
    case "bulletList":
      return createList(schema, "bulletList");
    case "orderedList":
      return createList(schema, "orderedList");
    case "taskList":
      return createList(schema, "taskList");
    case "blockquote":
      return createBlockquote(schema);
    case "codeBlock":
      return createCodeBlock(schema);
    default:
      return null;
  }
}

function insertNodeAt(editor: Editor, insertPos: number, node: ProseMirrorNode): void {
  const { view } = editor;
  const tr = view.state.tr.insert(insertPos, node);
  const selectionPos = Math.min(insertPos + 1, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

function focusInsertPos(editor: Editor, insertPos: number): void {
  const { view } = editor;
  const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(insertPos), 1));
  view.dispatch(tr);
  view.focus();
}

const MEDIA_BLOCK_IDS = new Set<BlockMenuItemId>(["image", "video"]);

export function isMediaBlockId(blockId: BlockMenuItemId): boolean {
  return MEDIA_BLOCK_IDS.has(blockId);
}

/** 打开系统文件选择器，返回 Data URL */
export function pickMediaFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.cssText = "position:fixed;left:-9999px;opacity:0";

    const cleanup = () => input.remove();

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    document.body.appendChild(input);
    input.click();
  });
}

/** 在指定文档位置插入图片/视频块（+ 号菜单） */
export function insertBlockMediaAt(
  editor: Editor,
  insertPos: number,
  blockId: "image" | "video",
  src: string,
): void {
  editor.chain().insertContentAt(insertPos, { type: blockId, attrs: { src } }).focus().run();
}

export function applyBlockTransform(editor: Editor, blockId: BlockMenuItemId): void {
  const chain = editor.chain().focus();

  switch (blockId) {
    case "paragraph":
      chain.setParagraph().run();
      return;
    case "heading1":
      chain.toggleHeading({ level: 1 }).run();
      return;
    case "heading2":
      chain.toggleHeading({ level: 2 }).run();
      return;
    case "heading3":
      chain.toggleHeading({ level: 3 }).run();
      return;
    case "bulletList":
      chain.toggleBulletList().run();
      return;
    case "orderedList":
      chain.toggleOrderedList().run();
      return;
    case "taskList":
      chain.toggleTaskList().run();
      return;
    case "blockquote":
      chain.toggleBlockquote().run();
      return;
    case "codeBlock":
      chain.toggleCodeBlock().run();
      return;
    case "table":
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      return;
    case "math":
      chain.insertBlockMath().run();
      return;
    case "horizontalRule":
      chain.setHorizontalRule().run();
      return;
    default:
      return;
  }
}

export function applyBlockInsert(
  editor: Editor,
  context: BlockInsertContext,
  blockId: BlockMenuItemId,
): void {
  const { insertPos } = context;
  const { schema } = editor.state;

  switch (blockId) {
    case "table":
      focusInsertPos(editor, insertPos);
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      return;
    case "math":
      focusInsertPos(editor, insertPos);
      editor.chain().focus().insertBlockMath().run();
      return;
    case "horizontalRule":
      focusInsertPos(editor, insertPos);
      editor.chain().focus().setHorizontalRule().run();
      return;
    default: {
      const node = createNodeForInsert(schema, blockId);
      if (node) insertNodeAt(editor, insertPos, node);
      return;
    }
  }
}
