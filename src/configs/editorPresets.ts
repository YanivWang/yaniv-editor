/**
 * 编辑器集成预设 — 与 YanivEditor features 同构，可直接 v-bind
 */
import type { FeatureConfig } from "@/core/editorTypes";

export interface EditorPresetProps {
  features?: FeatureConfig;
}

export type EditorPresetName = keyof typeof editorPresets;

/** 精简档位：基础排版 + 顶栏 */
const compactFeatures = {
  toolbar: "compact",
  headerNav: true,
  image: true,
  ai: true,
} as const satisfies FeatureConfig;

/** 生产环境推荐：完整工具栏 + 常用体验模块 */
const productionFeatures = {
  headerNav: true,
  footerNav: true,
  floatingMenu: true,
  slashCommand: true,
  linkBubbleMenu: true,
  tableToolbar: true,
  image: true,
  table: true,
  math: true,
  ai: true,
  formatPainter: true,
  outline: true,
  searchReplace: true,
  officePaste: true,
  dragHandle: true,
  statusShortcutHints: true,
} satisfies FeatureConfig;

export const editorPresets = {
  /** 生产推荐 */
  production: {
    features: productionFeatures,
  },

  /** 基础档位 + 顶栏 */
  basic: {
    features: compactFeatures,
  },

  /** 最小：精简工具栏，无顶栏 */
  minimal: {
    features: {
      toolbar: "compact",
    },
  },

  /** Notion 风格：隐藏固定工具栏，启用浮动菜单、斜杠菜单与块级操作体验 */
  notion: {
    features: {
      ...productionFeatures,
      headerNav: false,
      footerNav: false,
    },
  },
} as const satisfies Record<string, EditorPresetProps>;

/** 合并预设与自定义覆盖 */
export function mergeEditorPreset(
  preset: EditorPresetName | EditorPresetProps,
  overrides?: Partial<EditorPresetProps>,
): EditorPresetProps {
  const base = typeof preset === "string" ? editorPresets[preset] : preset;
  return {
    features: {
      ...base.features,
      ...overrides?.features,
    },
  };
}
