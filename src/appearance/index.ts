/**
 * Appearance and color public API.
 */

export { loadAppearance, preloadAppearances, isLoadableAppearance } from "./loadAppearance";
export type { LoadableAppearance } from "./loadAppearance";

export {
  applyCustomAppearanceToElement,
  applyAppearanceToElement,
  registerAppearance,
  resolveColorMode,
  watchSystemColorMode,
} from "./applyAppearance";

export { editorAppearanceInjectionKey, useInjectEditorAppearance } from "./appearanceContext";
export type { EditorAppearanceContext, ResolvedColorMode } from "./appearanceContext";
export { useEditorAppearance } from "./useEditorAppearance";
export { useResolvedColorMode } from "./useResolvedColorMode";

/** 可切换的视觉外观（不含 custom） */
export const EDITOR_APPEARANCES = ["default", "notion", "github", "typora", "word"] as const;
