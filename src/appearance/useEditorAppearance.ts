import { onWatcherCleanup, provide, watch, type ComputedRef, type Ref } from "vue";

import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";

import {
  editorAppearanceInjectionKey,
  type EditorAppearanceContext,
  ResolvedColorMode,
} from "./appearanceContext";
import { applyAppearanceToElement, watchSystemColorMode } from "./applyAppearance";
import { loadAppearance } from "./loadAppearance";
import { useResolvedColorMode } from "./useResolvedColorMode";

export interface UseEditorAppearanceOptions {
  rootRef: Ref<HTMLElement | null | undefined>;
  appearance: Ref<EditorAppearance>;
  colorMode: Ref<EditorColorMode>;
  customAppearanceVars?: Ref<Record<string, string> | undefined>;
}

export interface UseEditorAppearanceReturn {
  resolvedMode: ComputedRef<ResolvedColorMode>;
  appearanceContext: EditorAppearanceContext;
  registerCustomAppearance: (name: string, vars: Record<string, string>) => void;
}

export function useEditorAppearance(
  options: UseEditorAppearanceOptions,
): UseEditorAppearanceReturn {
  const { rootRef, appearance, colorMode, customAppearanceVars } = options;

  const customAppearances = new Map<string, Record<string, string>>();
  let activeCustomName = "custom";

  const resolvedMode = useResolvedColorMode(colorMode);

  const appearanceContext: EditorAppearanceContext = {
    appearance,
    colorMode,
    resolvedMode,
    registerCustom: (name: string, vars: Record<string, string>) => {
      activeCustomName = name;
      customAppearances.set(name, vars);
      syncDom();
    },
  };

  provide(editorAppearanceInjectionKey, appearanceContext);

  const syncDom = async () => {
    await loadAppearance(appearance.value);
    const el = rootRef.value;
    if (!el) return;
    const vars =
      customAppearanceVars?.value ??
      customAppearances.get("custom") ??
      customAppearances.get(activeCustomName);
    applyAppearanceToElement(el, appearance.value, colorMode.value, vars);
  };

  watch([rootRef, appearance, colorMode, resolvedMode, customAppearanceVars], syncDom, {
    immediate: true,
  });

  watch(
    () => colorMode.value,
    (mode) => {
      if (mode === "auto") {
        const cleanup = watchSystemColorMode(() => syncDom());
        onWatcherCleanup(cleanup);
      }
    },
    { immediate: true },
  );

  return {
    resolvedMode,
    appearanceContext,
    registerCustomAppearance: appearanceContext.registerCustom!,
  };
}
