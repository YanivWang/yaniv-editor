/**
 * 主题预设 CSS 按需加载（带缓存，避免重复注入）
 */
import type { ThemePreset } from "@/configs/editorConfig";

const LOADABLE_PRESETS = ["default", "word", "notion", "github", "typora"] as const;
export type LoadableThemePreset = (typeof LOADABLE_PRESETS)[number];

const loadedPresets = new Set<LoadableThemePreset>();

const presetLoaders: Record<LoadableThemePreset, () => Promise<unknown>> = {
  default: () => import("./presets/default.css"),
  word: () => import("./presets/word.css"),
  notion: () => import("./presets/notion.css"),
  github: () => import("./presets/github.css"),
  typora: () => import("./presets/typora.css"),
};

export function isLoadablePreset(preset: ThemePreset): preset is LoadableThemePreset {
  return (LOADABLE_PRESETS as readonly string[]).includes(preset);
}

/** 动态加载预设样式（custom 无独立 CSS 文件） */
export async function loadThemePreset(preset: ThemePreset): Promise<void> {
  if (!isLoadablePreset(preset) || loadedPresets.has(preset)) return;
  await presetLoaders[preset]();
  loadedPresets.add(preset);
}

/** 预加载多个预设（可选，用于 Demo） */
export async function preloadThemePresets(presets: ThemePreset[]): Promise<void> {
  await Promise.all(presets.map((p) => loadThemePreset(p)));
}
