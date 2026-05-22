import type { EditorMode } from "@yanivjs/yaniv-editor";
import type { InlineToolbarConfig } from "@yanivjs/yaniv-editor/inline";

export interface InlineToolbarToggle {
  key: keyof InlineToolbarConfig;
  label: string;
}

export const INLINE_TOOLBAR_TOGGLES: InlineToolbarToggle[] = [
  { key: "undoRedo", label: "撤销/重做" },
  { key: "heading", label: "标题" },
  { key: "textFormat", label: "文本格式" },
  { key: "list", label: "列表" },
  { key: "align", label: "对齐" },
  { key: "link", label: "链接" },
  { key: "clearFormat", label: "清除格式" },
  { key: "font", label: "字体" },
  { key: "codeBlock", label: "代码块" },
];

export const INLINE_FULL_TOOLBAR: InlineToolbarConfig = {
  undoRedo: true,
  heading: true,
  textFormat: true,
  list: true,
  align: true,
  link: true,
  clearFormat: true,
  font: true,
  codeBlock: true,
};

export const INLINE_MODE_OPTIONS = [
  { label: "编辑", value: "edit" as EditorMode },
  { label: "预览", value: "preview" as EditorMode },
];

export interface InlineHint {
  id: string;
  label: string;
  hint: string;
}

export const INLINE_HINTS: InlineHint[] = [
  {
    id: "toolbar",
    label: "toolbar 配置",
    hint: "开关与扩展注册同步；关闭某项则按钮隐藏且扩展不注册",
  },
  { id: "undoRedo", label: "撤销/重做", hint: "工具栏 UndoRedoButton / InlineToolbar 内置" },
  { id: "heading", label: "标题", hint: "HeadingControl 下拉" },
  { id: "textFormat", label: "文本格式", hint: "粗体、斜体、下划线等" },
  { id: "list", label: "列表", hint: "有序、无序、任务列表（compose 页可开 taskList）" },
  { id: "align", label: "对齐", hint: "AlignDropdown" },
  { id: "link", label: "链接", hint: "LinkButton" },
  { id: "clearFormat", label: "清除格式", hint: "ClearFormatButton" },
  { id: "font", label: "字体", hint: "FontSizeSelect / FontFamilySelect（InlineToolbar）" },
  { id: "codeBlock", label: "代码块", hint: "CodeBlockDropdown" },
  { id: "preview", label: "预览 mode", hint: "mode=preview 时隐藏工具栏且不可编辑" },
  {
    id: "compose",
    label: "自行拼装",
    hint: "见「行内自行拼装」：YanivInlineEditor #toolbar 插槽按需挂载按钮",
  },
];

export function buildInlineToolbar(
  enabled: Record<keyof InlineToolbarConfig, boolean>,
): InlineToolbarConfig {
  const toolbar = {} as InlineToolbarConfig;
  for (const { key } of INLINE_TOOLBAR_TOGGLES) {
    if (enabled[key]) toolbar[key] = true;
  }
  return toolbar;
}
