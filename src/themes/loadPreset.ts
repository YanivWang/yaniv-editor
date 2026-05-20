/**
 * 主题预设：样式已打入 @yanivjs/yaniv-editor/style.css，运行时仅标记已「加载」并配合 applyTheme 切换 class。
 */
import type { ThemePreset } from "@/configs/editorConfig";

const LOADABLE_PRESETS = ["default", "word", "notion", "github", "typora"] as const;
export type LoadableThemePreset = (typeof LOADABLE_PRESETS)[number];

const loadedPresets = new Set<LoadableThemePreset>();

export function isLoadablePreset(preset: ThemePreset): preset is LoadableThemePreset {
  return (LOADABLE_PRESETS as readonly string[]).includes(preset);
}

/** 标记预设已就绪（CSS 由 style.css 提供，无需动态 import） */
export async function loadThemePreset(preset: ThemePreset): Promise<void> {
  if (!isLoadablePreset(preset) || loadedPresets.has(preset)) return;
  loadedPresets.add(preset);
}

/** 预加载多个预设（与 loadThemePreset 等价，保留 API 兼容） */
export async function preloadThemePresets(presets: ThemePreset[]): Promise<void> {
  await Promise.all(presets.map((p) => loadThemePreset(p)));
}
