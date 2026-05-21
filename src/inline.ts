/**
 * Yaniv Editor Inline entry.
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

export { provideYanivEditor, useYanivEditor } from "./core/editorContext";
export { resolveInlineGates } from "./core/runtime/resolveInlineGates";
export { resolveShowInlineToolbar } from "./capabilities/resolveShowInlineToolbar";
export { buildExtensions } from "./capabilities/buildExtensions";
export type { EditorShellHost, ExtensionGates } from "./core/runtime/types";

export type { HeadingLevel } from "./configs/toolbarTypes";
export type { Editor } from "@tiptap/core";
