/**
 * Appearance and color public API.
 */

export { loadAppearance, preloadAppearances, isLoadableAppearance } from "./loadAppearance";
export type { LoadableAppearance } from "./loadAppearance";

/** 有 CSS 文件的三种外观（不含 `custom`）；与 `LOADABLE_APPEARANCES` 同一份数据 */
export { LOADABLE_APPEARANCES as EDITOR_APPEARANCES } from "./loadAppearance";

export {
  applyCustomAppearanceToElement,
  applyAppearanceToElement,
  getAppearanceClassName,
  resolveColorMode,
  watchSystemColorMode,
} from "./applyAppearance";

export { editorAppearanceInjectionKey, useInjectEditorAppearance } from "./appearanceContext";
export type { EditorAppearanceContext, ResolvedColorMode } from "./appearanceContext";
export { useEditorAppearance } from "./useEditorAppearance";
export { useResolvedColorMode } from "./useResolvedColorMode";
