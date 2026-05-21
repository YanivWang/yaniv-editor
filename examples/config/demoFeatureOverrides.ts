import type { FeatureConfig } from "@/core/editorTypes";

export type FeatureOverrideMode = "default" | "on" | "off";

export type FeatureOverrideKey = keyof Required<FeatureConfig>;

export interface FeatureOverrideItem {
  key: FeatureOverrideKey;
  label: string;
}

export const FEATURE_OVERRIDE_ITEMS: FeatureOverrideItem[] = [
  { key: "image", label: "图片" },
  { key: "video", label: "视频" },
  { key: "table", label: "表格" },
  { key: "math", label: "数学" },
  { key: "ai", label: "AI" },
  { key: "formatPainter", label: "格式刷" },
  { key: "outline", label: "大纲" },
  { key: "searchReplace", label: "查找替换" },
  { key: "officePaste", label: "Office 粘贴" },
  { key: "slashCommand", label: "斜杠命令" },
  { key: "dragHandle", label: "拖拽块" },
];

export const OVERRIDE_MODE_OPTIONS = [
  { label: "跟随方案", value: "default" as const },
  { label: "强制开", value: "on" as const },
  { label: "强制关", value: "off" as const },
];

export type FeatureOverrideState = Record<FeatureOverrideKey, FeatureOverrideMode>;

export function createDefaultOverrideState(): FeatureOverrideState {
  return Object.fromEntries(
    FEATURE_OVERRIDE_ITEMS.map((i) => [i.key, "default"]),
  ) as FeatureOverrideState;
}

export function buildFeatureConfig(state: FeatureOverrideState): FeatureConfig | undefined {
  const config: FeatureConfig = {};
  let hasOverride = false;

  for (const { key } of FEATURE_OVERRIDE_ITEMS) {
    const mode = state[key];
    if (mode === "on") {
      config[key] = true;
      hasOverride = true;
    } else if (mode === "off") {
      config[key] = false;
      hasOverride = true;
    }
  }

  return hasOverride ? config : undefined;
}

export function overridesKey(state: FeatureOverrideState): string {
  return FEATURE_OVERRIDE_ITEMS.map((i) => `${i.key}:${state[i.key]}`).join("|");
}
