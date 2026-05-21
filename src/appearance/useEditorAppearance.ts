/**
 * YanivEditor 内部视觉外观：在根节点应用类名与 data-color-mode
 */
import { provide, watch, type ComputedRef, type Ref } from "vue";

import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";

import {
  editorAppearanceInjectionKey,
  type EditorAppearanceContext,
  ResolvedColorMode,
} from "./appearanceContext";
import { applyAppearanceToElement } from "./applyAppearance";
import { loadAppearance } from "./loadAppearance";
import { useResolvedColorMode } from "./useResolvedColorMode";

export interface UseEditorAppearanceOptions {
  rootRef: Ref<HTMLElement | null | undefined>;
  appearance: Ref<EditorAppearance>;
  colorMode: Ref<EditorColorMode>;
}

export interface UseEditorAppearanceReturn {
  resolvedMode: ComputedRef<ResolvedColorMode>;
  appearanceContext: EditorAppearanceContext;
}

export function useEditorAppearance(
  options: UseEditorAppearanceOptions,
): UseEditorAppearanceReturn {
  const { rootRef, appearance, colorMode } = options;

  const resolvedMode = useResolvedColorMode(colorMode);

  const appearanceContext: EditorAppearanceContext = {
    appearance,
    colorMode,
    resolvedMode,
  };

  provide(editorAppearanceInjectionKey, appearanceContext);

  const syncDom = async () => {
    await loadAppearance(appearance.value);
    const el = rootRef.value;
    if (el) applyAppearanceToElement(el, appearance.value, colorMode.value);
  };

  watch([rootRef, appearance, colorMode, resolvedMode], syncDom, { immediate: true });

  return { resolvedMode, appearanceContext };
}
