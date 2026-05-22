import {
  COMPACT_TOOLBAR_CONFIG,
  FULL_TOOLBAR_CONFIG,
  type ToolbarToolsConfig,
} from "@/components/tools/header-nav";
import type { EditorPreset } from "@/core/editorTypes";

export interface FullEditorPresetConfig {
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

/** 多个 preset 共用的文档型布局默认值，具体方案只覆盖差异项。 */
const sharedLayout: FullEditorPresetConfig["layout"] = {
  header: true,
  footer: true,
  floatingMenu: true,
  linkBubble: true,
  tableTools: true,
  shortcutHints: false,
  outlineAnchor: "top-right",
  zoomPlacement: "bottom",
  tableToolsShowMode: 2,
};

export const fullEditorPresetConfig = {
  basic: {
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
    toolbar: FULL_TOOLBAR_CONFIG,
    layout: {
      ...sharedLayout,
      shortcutHints: true,
    },
  },
  notion: {
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
