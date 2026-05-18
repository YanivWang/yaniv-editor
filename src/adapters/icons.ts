/**
 * Icons Adapter
 * Allows users to provide their own icon components
 */

import type { Component } from "vue";

export type IconName =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "heading1"
  | "heading2"
  | "heading3"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "alignJustify"
  | "listBullet"
  | "listOrdered"
  | "listCheck"
  | "link"
  | "image"
  | "table"
  | "code"
  | "codeBlock"
  | "undo"
  | "redo"
  | "formatClear"
  | "formatPainter"
  | "subscript"
  | "superscript"
  | "quote"
  | "horizontalRule"
  | "plus"
  | "minus"
  | "close"
  | "check"
  | "chevronDown"
  | "chevronUp"
  | "chevronLeft"
  | "chevronRight"
  | "drag"
  | "copy"
  | "cut"
  | "delete"
  | "duplicate"
  | "ai"
  | "sparkles"
  | "wand"
  | "sun"
  | "moon";

export type IconAdapter = Partial<Record<IconName, Component | string>>;

/**
 * Default icons using Unicode/Emoji
 * Users can replace with Lucide, Ant Design Icons, etc.
 */
export const defaultIconAdapter: IconAdapter = {
  bold: "𝐁",
  italic: "𝐼",
  underline: "U̲",
  strikethrough: "S̶",
  heading1: "H1",
  heading2: "H2",
  heading3: "H3",
  alignLeft: "☰",
  alignCenter: "☰",
  alignRight: "☰",
  listBullet: "•",
  listOrdered: "1.",
  link: "🔗",
  image: "🖼",
  table: "▦",
  code: "</>",
  undo: "↶",
  redo: "↷",
  plus: "+",
  minus: "−",
  close: "✕",
  check: "✓",
  ai: "✨",
};

// Global adapter instance
let _adapter: IconAdapter = defaultIconAdapter;

export function setIconAdapter(adapter: IconAdapter): void {
  _adapter = { ...defaultIconAdapter, ...adapter };
}

export function getIconAdapter(): IconAdapter {
  return _adapter;
}

export function getIcon(name: IconName): Component | string {
  return _adapter[name] || name;
}
