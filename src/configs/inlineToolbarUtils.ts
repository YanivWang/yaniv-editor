import type { InlineToolbarConfig } from "./inlineTypes";

const INLINE_TOOLBAR_KEYS = [
  "undoRedo",
  "heading",
  "textFormat",
  "list",
  "align",
  "link",
  "clearFormat",
  "font",
  "codeBlock",
] as const satisfies ReadonlyArray<keyof InlineToolbarConfig>;

export function hasInlineToolbarItems(toolbar?: InlineToolbarConfig): boolean {
  if (!toolbar) return false;
  return INLINE_TOOLBAR_KEYS.some((key) => toolbar[key] === true);
}
