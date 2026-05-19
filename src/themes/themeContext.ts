/**
 * 编辑器主题上下文（provide / inject）
 */
import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";

import type { ThemeMode, ThemePreset } from "@/configs/editorConfig";

export type ResolvedThemeMode = "light" | "dark";

export interface EditorThemeContext {
  /** 视觉预设（皮肤） */
  preset: Ref<ThemePreset>;
  /** 用户选择的模式（含 auto） */
  mode: Ref<ThemeMode>;
  /** 解析后的实际明暗（auto 会跟随系统） */
  resolvedMode: ComputedRef<ResolvedThemeMode>;
  setPreset: (preset: ThemePreset) => void;
  setMode: (mode: ThemeMode) => void;
}

export const editorThemeInjectionKey: InjectionKey<EditorThemeContext> = Symbol("yanivEditorTheme");

/** 在 YanivEditor 子树中获取主题上下文 */
export function useInjectEditorTheme(): EditorThemeContext | undefined {
  return inject(editorThemeInjectionKey);
}
