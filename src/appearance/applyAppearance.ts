/**
 * 将视觉外观应用到 DOM 节点（仅作用于传入的 target，通常为 .yaniv-editor 根节点）
 */
import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";

import type { ResolvedColorMode } from "./appearanceContext";

const APPEARANCE_CLASS_NAMES = [
  "appearance-default",
  "appearance-notion",
  "appearance-github",
  "appearance-typora",
  "appearance-word",
  "appearance-custom",
] as const;

const customAppearances = new Map<string, Record<string, string>>();
let activeCustomAppearanceName = "custom";

export function resolveColorMode(mode: EditorColorMode): ResolvedColorMode {
  if (mode === "auto") return getSystemColorMode();
  return mode;
}

export function applyAppearanceToElement(
  target: HTMLElement,
  appearance: EditorAppearance,
  mode: EditorColorMode = "light",
): ResolvedColorMode {
  APPEARANCE_CLASS_NAMES.forEach((name) => target.classList.remove(name));

  const classPreset = appearance === "custom" ? "custom" : appearance;
  target.classList.add(`appearance-${classPreset}`);

  const resolved = resolveColorMode(mode);
  target.setAttribute("data-color-mode", resolved);

  if (appearance === "custom") {
    const vars =
      customAppearances.get("custom") ?? customAppearances.get(activeCustomAppearanceName);
    if (vars) applyCustomAppearanceToElement(target, vars);
  } else {
    // 从 custom 切回内置外观时，清掉曾经写入根节点的 CSS 变量。
    clearCustomAppearanceInlineVars(target);
  }

  return resolved;
}

export function registerAppearance(name: string, variables: Record<string, string>): void {
  activeCustomAppearanceName = name;
  customAppearances.set(name, variables);
}

export function applyCustomAppearanceToElement(
  target: HTMLElement,
  variables: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(variables)) {
    target.style.setProperty(key, value);
  }
}

function clearCustomAppearanceInlineVars(target: HTMLElement): void {
  for (const vars of customAppearances.values()) {
    for (const key of Object.keys(vars)) {
      target.style.removeProperty(key);
    }
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
