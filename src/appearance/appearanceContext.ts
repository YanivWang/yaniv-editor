/**
 * 编辑器视觉上下文（provide / inject）
 */
import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";

import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";

export type ResolvedColorMode = "light" | "dark";

/** 注入的视觉上下文；修改请通过 YanivEditor 的 appearance / colorMode props */
export interface EditorAppearanceContext {
  appearance: Ref<EditorAppearance>;
  colorMode: Ref<EditorColorMode>;
  resolvedMode: ComputedRef<ResolvedColorMode>;
}

export const editorAppearanceInjectionKey: InjectionKey<EditorAppearanceContext> =
  Symbol("yanivEditorAppearance");

export function useInjectEditorAppearance(): EditorAppearanceContext | undefined {
  return inject(editorAppearanceInjectionKey);
}
