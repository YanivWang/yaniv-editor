/**
 * 将 ThemeMode（含 auto）解析为实际 light/dark，并在 auto 时监听系统变化
 * 供宿主外壳（Demo 顶栏、侧栏等）与 YanivEditor 共用同一 resolved 值
 */
import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from "vue";

import type { ThemeMode } from "@/configs/editorConfig";

import { resolveThemeMode, watchSystemTheme } from "./applyTheme";

import type { ResolvedThemeMode } from "./themeContext";

export function useResolvedThemeMode(mode: Ref<ThemeMode>): ComputedRef<ResolvedThemeMode> {
  const systemTick = ref(0);
  let stopSystemWatch: (() => void) | undefined;

  const bindSystemWatch = (next: ThemeMode) => {
    stopSystemWatch?.();
    stopSystemWatch = undefined;
    if (next !== "auto") return;
    stopSystemWatch = watchSystemTheme(() => {
      systemTick.value += 1;
    });
  };

  watch(mode, bindSystemWatch, { immediate: true });

  onBeforeUnmount(() => {
    stopSystemWatch?.();
  });

  return computed(() => {
    void systemTick.value;
    return resolveThemeMode(mode.value);
  });
}
