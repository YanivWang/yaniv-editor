/**
 * 编辑器主题上下文（provide / inject）
 */
import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";

import type { ThemeMode, ThemePreset } from "@/configs/editorConfig";

export type ResolvedThemeMode = "light" | "dark";

/** 只读主题上下文；修改请通过 YanivEditor 的 themePreset / themeMode props */
export interface EditorThemeContext {
  preset: Ref<ThemePreset>;
  mode: Ref<ThemeMode>;
  resolvedMode: ComputedRef<ResolvedThemeMode>;
}

export const editorThemeInjectionKey: InjectionKey<EditorThemeContext> = Symbol("yanivEditorTheme");

export function useInjectEditorTheme(): EditorThemeContext | undefined {
  return inject(editorThemeInjectionKey);
}
