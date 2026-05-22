import type { Component } from "vue";

export type BlockMenuItemId =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "table"
  | "image"
  | "video"
  | "math"
  | "horizontalRule";

export type BlockMenuGroupId = "basicBlocks" | "lists" | "advanced";

export interface BlockMenuItemDef {
  id: BlockMenuItemId;
  title: string;
  description: string;
  icon: Component;
  keywords: string[];
  group: BlockMenuGroupId;
}

export interface BlockMenuGroupDef {
  id: BlockMenuGroupId;
  title: string;
  items: BlockMenuItemDef[];
}

export type BlockPickerMode = "slash" | "insert";

export interface BlockInsertContext {
  targetPos: number;
  targetNodeSize: number;
  insertPos: number;
  /** + 按钮位置，用于水平定位 */
  anchorRect: DOMRect;
  /** 当前块 DOM 位置，用于垂直顶对齐（默认向下展开） */
  blockRect: DOMRect;
}
