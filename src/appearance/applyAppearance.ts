/**
 * 将视觉外观应用到 DOM 节点（纯函数，无模块级单例）
 */
import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";

import type { ResolvedColorMode } from "./appearanceContext";

export function resolveColorMode(mode: EditorColorMode): ResolvedColorMode {
  if (mode === "auto") return getSystemColorMode();
  return mode;
}

/** custom 仅生成 appearance-custom class，无对应 CSS 文件；样式由 customAppearanceVars 内联注入 */
export function getAppearanceClassName(appearance: EditorAppearance): string {
  const classPreset = appearance === "custom" ? "custom" : appearance;
  return `appearance-${classPreset}`;
}

export function applyAppearanceToElement(
  target: HTMLElement,
  appearance: EditorAppearance,
  mode: EditorColorMode = "light",
  customVars?: Record<string, string>,
): ResolvedColorMode {
  const resolved = resolveColorMode(mode);
  target.setAttribute("data-color-mode", resolved);

  if (appearance === "custom" && customVars) {
    applyCustomAppearanceToElement(target, customVars);
  } else if (appearance !== "custom") {
    clearCustomAppearanceInlineVars(target, customVars);
  }

  return resolved;
}

export function applyCustomAppearanceToElement(
  target: HTMLElement,
  variables: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(variables)) {
    target.style.setProperty(key, value);
  }
}

function clearCustomAppearanceInlineVars(target: HTMLElement, vars?: Record<string, string>): void {
  if (!vars) return;
  for (const key of Object.keys(vars)) {
    target.style.removeProperty(key);
  }
}

function getSystemColorMode(): ResolvedColorMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function watchSystemColorMode(callback: (mode: ResolvedColorMode) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? "dark" : "light");
  };

  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}
