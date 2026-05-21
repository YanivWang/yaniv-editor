/**
 * 将 EditorColorMode（含 auto）解析为实际 light/dark，并在 auto 时监听系统变化。
 * 供宿主外壳（Demo 顶栏、侧栏等）与 YanivEditor 共用同一 resolved 值。
 */
import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from "vue";

import type { EditorColorMode } from "@/configs/editorConfig";

import { resolveColorMode, watchSystemColorMode } from "./applyAppearance";

import type { ResolvedColorMode } from "./appearanceContext";

export function useResolvedColorMode(mode: Ref<EditorColorMode>): ComputedRef<ResolvedColorMode> {
  const systemTick = ref(0);
  let stopSystemWatch: (() => void) | undefined;

  const bindSystemWatch = (next: EditorColorMode) => {
    stopSystemWatch?.();
    stopSystemWatch = undefined;
    if (next !== "auto") return;
    stopSystemWatch = watchSystemColorMode(() => {
      systemTick.value += 1;
    });
  };

  watch(mode, bindSystemWatch, { immediate: true });

  onBeforeUnmount(() => {
    stopSystemWatch?.();
  });

  return computed(() => {
    // systemTick 只用于让 auto 模式在系统明暗变化时重新求值。
    void systemTick.value;
    return resolveColorMode(mode.value);
  });
}
