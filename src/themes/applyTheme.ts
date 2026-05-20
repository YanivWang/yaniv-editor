/**
 * 将主题应用到 DOM 节点（仅作用于传入的 target，通常为 .yaniv-editor 根节点）
 */
import type { ThemeMode, ThemePreset } from "@/configs/editorConfig";

import type { ResolvedThemeMode } from "./themeContext";

const THEME_CLASS_NAMES = [
  "theme-default",
  "theme-notion",
  "theme-github",
  "theme-typora",
  "theme-word",
  "theme-custom",
] as const;

const customThemes = new Map<string, Record<string, string>>();
let activeCustomThemeName = "custom";

export function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  if (mode === "auto") return getSystemTheme();
  return mode;
}

export function applyThemeToElement(
  target: HTMLElement,
  preset: ThemePreset,
  mode: ThemeMode = "light",
): ResolvedThemeMode {
  THEME_CLASS_NAMES.forEach((name) => target.classList.remove(name));

  const classPreset = preset === "custom" ? "custom" : preset;
  target.classList.add(`theme-${classPreset}`);

  const resolved = resolveThemeMode(mode);
  target.setAttribute("data-theme", resolved);

  if (preset === "custom") {
    const vars = customThemes.get("custom") ?? customThemes.get(activeCustomThemeName);
    if (vars) applyCustomThemeToElement(target, vars);
  } else {
    clearCustomThemeInlineVars(target);
  }

  return resolved;
}

export function registerTheme(name: string, variables: Record<string, string>): void {
  activeCustomThemeName = name;
  customThemes.set(name, variables);
}

export function applyCustomThemeToElement(
  target: HTMLElement,
  variables: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(variables)) {
    target.style.setProperty(key, value);
  }
}

function clearCustomThemeInlineVars(target: HTMLElement): void {
  for (const vars of customThemes.values()) {
    for (const key of Object.keys(vars)) {
      target.style.removeProperty(key);
    }
  }
}

function getSystemTheme(): ResolvedThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function watchSystemTheme(callback: (mode: ResolvedThemeMode) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? "dark" : "light");
  };

  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}
