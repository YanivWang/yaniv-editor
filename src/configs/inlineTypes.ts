/**
 * Inline Editor types — lightweight shell separate from Full Editor FeatureConfig
 */
import type { ToolbarToolsConfig } from "@/components/tools/header-nav/toolbarConfig";
import type { EditorColorMode } from "@/configs/editorConfig";

import type { AnyExtension, JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/vue-3";

/** Toolbar switches backed by /inline exported components only */
export type InlineToolbarConfig = Pick<
  ToolbarToolsConfig,
  | "undoRedo"
  | "heading"
  | "textFormat"
  | "list"
  | "align"
  | "link"
  | "clearFormat"
  | "font"
  | "codeBlock"
>;

export interface YanivInlineEditorProps {
  /** v-model:content — HTML string */
  content?: string;
  mode?: "edit" | "preview";
  locale?: string;
  toolbar?: InlineToolbarConfig;
  placeholder?: string;
  extraExtensions?: AnyExtension[];
  editorProps?: Record<string, unknown>;
  colorMode?: EditorColorMode;
  /**
   * 浮层 z-index 基准值，映射为编辑器根节点上的 `--ye-z-base`。
   * 宿主页面有高层级 UI 时可提高此值；默认 1000。
   */
  zIndexBase?: number;
}

export interface YanivInlineEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
