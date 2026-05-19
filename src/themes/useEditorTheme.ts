/**
 * YanivEditor 内部主题：按需加载 preset CSS，在根节点应用类名与 data-theme
 */
import { provide, watch, type ComputedRef, type Ref } from "vue";

import type { ThemeMode, ThemePreset } from "@/configs/editorConfig";

import { applyThemeToElement } from "./applyTheme";
import { loadThemePreset } from "./loadPreset";
import { editorThemeInjectionKey, type EditorThemeContext , ResolvedThemeMode } from "./themeContext";
import { useResolvedThemeMode } from "./useResolvedThemeMode";

export interface UseEditorThemeOptions {
  rootRef: Ref<HTMLElement | null | undefined>;
  preset: Ref<ThemePreset>;
  mode: Ref<ThemeMode>;
}

export interface UseEditorThemeReturn {
  resolvedMode: ComputedRef<ResolvedThemeMode>;
  themeContext: EditorThemeContext;
}

export function useEditorTheme(options: UseEditorThemeOptions): UseEditorThemeReturn {
  const { rootRef, preset, mode } = options;

  const resolvedMode = useResolvedThemeMode(mode);

  const themeContext: EditorThemeContext = {
    preset,
    mode,
    resolvedMode,
  };

  provide(editorThemeInjectionKey, themeContext);

  const syncDom = async () => {
    await loadThemePreset(preset.value);
    const el = rootRef.value;
    if (el) applyThemeToElement(el, preset.value, mode.value);
  };

  watch([preset, mode, resolvedMode], syncDom, { immediate: true });

  return { resolvedMode, themeContext };
}
