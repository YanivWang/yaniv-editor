/**
 * Yaniv Editor Inline entry.
 *
 * Lightweight inline shell + toolbar building blocks for apps that want
 * a default toolbar or full DIY composition.
 */

export { default as YanivInlineEditor } from "./core/YanivInlineEditor.vue";
export { InlineToolbar } from "./components/tools/inline-toolbar";

export { UndoRedoButton } from "./components/editor/undo-redo";
export { HeadingControl } from "./components/editor/heading";
export { TextFormatButtons } from "./components/editor/text-format";
export { ListTools } from "./components/editor/list";
export { AlignDropdown } from "./components/editor/align";
export { LinkButton } from "./components/editor/link";
export { ClearFormatButton } from "./components/editor/format-clear";
export { FontSizeSelect, FontFamilySelect } from "./components/editor/font";
export { CodeBlockDropdown } from "./components/editor/code-block";

export { DEFAULT_INLINE_TOOLBAR } from "./configs/inlineToolbar";
export type {
  InlineToolbarConfig,
  YanivInlineEditorProps,
  YanivInlineEditorExpose,
} from "./configs/inlineTypes";

export {
  buildInlineExtensions,
  resolveInlineExtensionGates,
  hasInlineToolbarItems,
} from "./extensions/inlineExtensions";
export type {
  ResolvedInlineExtensionGates,
  ResolveInlineExtensionGatesInput,
  BuildInlineExtensionsOptions,
} from "./extensions/inlineExtensions";

export { provideYanivEditor, useYanivEditor } from "./core/editorContext";

export type { HeadingLevel } from "./configs/toolbarTypes";
export type { Editor } from "@tiptap/core";
