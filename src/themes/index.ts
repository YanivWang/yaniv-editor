/**
 * Theme Manager — 公共 API
 */

export { loadThemePreset, preloadThemePresets, isLoadablePreset } from "./loadPreset";
export type { LoadableThemePreset } from "./loadPreset";

export {
  applyCustomThemeToElement,
  applyThemeToElement,
  registerTheme,
  resolveThemeMode,
  watchSystemTheme,
} from "./applyTheme";

export { editorThemeInjectionKey, useInjectEditorTheme } from "./themeContext";
export type { EditorThemeContext, ResolvedThemeMode } from "./themeContext";
export { useEditorTheme } from "./useEditorTheme";
export { useResolvedThemeMode } from "./useResolvedThemeMode";

/** 可切换的预设（不含 custom） */
export const THEME_PRESETS = ["default", "notion", "github", "typora", "word"] as const;
