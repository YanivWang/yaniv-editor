/**
 * YanivEditor 内部主题：按需加载 preset CSS，在根节点应用类名与 data-theme
 */
import { computed, onBeforeUnmount, provide, watch, type ComputedRef, type Ref } from "vue";

import type { ThemeMode, ThemePreset } from "@/configs/editorConfig";

import { applyThemeToElement, resolveThemeMode, watchSystemTheme } from "./applyTheme";
import { loadThemePreset } from "./loadPreset";

import type { ResolvedThemeMode , editorThemeInjectionKey, type EditorThemeContext } from "./themeContext";

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

  const resolvedMode = computed(() => resolveThemeMode(mode.value));

  let stopSystemWatch: (() => void) | undefined;

  const syncDom = async () => {
    await loadThemePreset(preset.value);
    const el = rootRef.value;
    if (el) applyThemeToElement(el, preset.value, mode.value);
  };

  const themeContext: EditorThemeContext = {
    preset,
    mode,
    resolvedMode,
    setPreset: (p) => {
      preset.value = p;
    },
    setMode: (m) => {
      mode.value = m;
    },
  };

  provide(editorThemeInjectionKey, themeContext);

  watch([preset, mode], syncDom, { immediate: true });

  watch(
    () => mode.value,
    (next) => {
      stopSystemWatch?.();
      stopSystemWatch = undefined;
      if (next !== "auto") return;
      stopSystemWatch = watchSystemTheme(() => {
        const el = rootRef.value;
        if (el) applyThemeToElement(el, preset.value, "auto");
      });
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    stopSystemWatch?.();
  });

  return { resolvedMode, themeContext };
}
