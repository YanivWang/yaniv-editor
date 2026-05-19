/**
 * 编辑器集成预设 — 与 YanivEditor 的 version / features 同构，可直接 v-bind
 */
import type { EditorVersion, FeatureConfig, YanivEditorProps } from "@/core/editorTypes";

export type EditorPresetProps = Pick<YanivEditorProps, "version" | "features">;

export type EditorPresetName = keyof typeof editorPresets;

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
  ai: true,
  searchReplace: true,
  officePaste: true,
  dragHandle: true,
} satisfies FeatureConfig;

export const editorPresets = {
  /** 生产推荐 */
  production: {
    version: "advanced",
    features: productionFeatures,
  },

  /** 完整能力（同 production，别名） */
  full: {
    version: "advanced",
    features: productionFeatures,
  },

  /** 基础档位 + 顶栏 */
  basic: {
    version: "basic",
    features: {
      headerNav: true,
    },
  },

  /** 最小：基础档位，无顶栏 */
  minimal: {
    version: "basic",
    features: {},
  },

  /** Notion 风格：隐藏固定工具栏，启用浮动菜单、斜杠菜单与块级操作体验 */
  notion: {
    version: "advanced",
    features: {
      headerNav: false,
      footerNav: false,
      floatingMenu: true,
      slashCommand: true,
      linkBubbleMenu: true,
      tableToolbar: true,
      image: true,
      table: true,
      dragHandle: true,
    },
  },
} as const satisfies Record<string, { version: EditorVersion; features: FeatureConfig }>;

/** 合并预设与自定义覆盖 */
export function mergeEditorPreset(
  preset: EditorPresetName | EditorPresetProps,
  overrides?: Partial<EditorPresetProps>,
): EditorPresetProps {
  const base = typeof preset === "string" ? editorPresets[preset] : preset;
  return {
    version: overrides?.version ?? base.version,
    features: {
      ...base.features,
      ...overrides?.features,
    },
  };
}
