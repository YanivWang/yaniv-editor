import {
  COMPACT_TOOLBAR_CONFIG,
  FULL_TOOLBAR_CONFIG,
  type ToolbarToolsConfig,
} from "@/components/tools/header-nav";
import type { EditorPreset, FeatureConfig } from "@/core/editorTypes";

export interface FullEditorPresetConfig {
  features: Required<FeatureConfig>;
  toolbar: ToolbarToolsConfig;
  /** layout 是 preset 内部策略，不再作为 public props 暴露给集成方。 */
  layout: {
    header: boolean;
    footer: boolean;
    floatingMenu: boolean;
    linkBubble: boolean;
    tableTools: boolean;
    shortcutHints: boolean;
    outlineAnchor: "top-left" | "top-right";
    zoomPlacement: "bottom" | "belowToolbar";
    tableToolsShowMode: 1 | 2;
  };
}

export const basicFeatures: Required<FeatureConfig> = {
  image: true,
  video: true,
  table: true,
  math: false,
  ai: false,
  formatPainter: false,
  outline: false,
  searchReplace: false,
  officePaste: false,
  slashCommand: false,
  dragHandle: false,
};

export const fullFeatures: Required<FeatureConfig> = {
  image: true,
  video: true,
  table: true,
  math: true,
  ai: true,
  formatPainter: true,
  outline: true,
  searchReplace: true,
  officePaste: true,
  slashCommand: true,
  dragHandle: true,
};

export const notionFeatures: Required<FeatureConfig> = {
  ...fullFeatures,
  // Notion 方案强调块编辑，不默认带入偏文档办公的重量能力。
  math: false,
  officePaste: false,
  searchReplace: false,
};

/** 多个 preset 共用的文档型布局默认值，具体方案只覆盖差异项。 */
const sharedLayout: FullEditorPresetConfig["layout"] = {
  header: true,
  footer: true,
  floatingMenu: true,
  linkBubble: true,
  tableTools: true,
  shortcutHints: false,
  outlineAnchor: "top-left",
  zoomPlacement: "bottom",
  tableToolsShowMode: 2,
};

export const fullEditorPresetConfig = {
  basic: {
    features: basicFeatures,
    toolbar: {
      ...COMPACT_TOOLBAR_CONFIG,
      ai: false,
      link: true,
      table: true,
      video: true,
    },
    layout: {
      ...sharedLayout,
      floatingMenu: false,
      shortcutHints: false,
    },
  },
  full: {
    features: fullFeatures,
    toolbar: FULL_TOOLBAR_CONFIG,
    layout: {
      ...sharedLayout,
      shortcutHints: true,
    },
  },
  notion: {
    features: notionFeatures,
    toolbar: {
      ...COMPACT_TOOLBAR_CONFIG,
      image: true,
      video: true,
      link: true,
      table: true,
      ai: true,
    },
    layout: {
      ...sharedLayout,
      header: false,
      footer: false,
      floatingMenu: true,
      shortcutHints: false,
    },
  },
} as const satisfies Record<EditorPreset, FullEditorPresetConfig>;

export function resolvePresetFeatures(
  preset: EditorPreset,
  overrides?: FeatureConfig,
): Required<FeatureConfig> {
  // features 是能力级覆盖层，显式 false 必须能关闭 preset 默认开启的能力。
  return {
    ...fullEditorPresetConfig[preset].features,
    ...overrides,
  };
}
