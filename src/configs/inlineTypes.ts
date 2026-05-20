/**
 * Inline Editor types — lightweight shell separate from Full Editor FeatureConfig
 */
import type { ToolbarToolsConfig } from "@/components/tools/header-nav/toolbarConfig";

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

export interface InlinePresetProps {
  toolbar?: InlineToolbarConfig;
}

export interface YanivInlineEditorProps {
  /** v-model:content — HTML string */
  content?: string;
  readonly?: boolean;
  locale?: string;
  toolbar?: InlineToolbarConfig;
  placeholder?: string;
  extraExtensions?: AnyExtension[];
  editorProps?: Record<string, unknown>;
}

export interface YanivInlineEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
