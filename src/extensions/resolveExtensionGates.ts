/**
 * 扩展功能门控 — 与 YanivEditor features 对齐
 * @description 单一解析入口，避免「UI 关了但扩展仍注册」的不一致
 */

import type { FeatureConfig } from "@/core/editorTypes";

/** 解析后的门控（全部显式布尔，供 buildEditorExtensions 使用） */
export interface ResolvedExtensionGates {
  table: boolean;
  image: boolean;
  video: boolean;
  math: boolean;
  ai: boolean;
  formatPainter: boolean;
  /** 标题 UniqueID + 目录扩展 */
  outline: boolean;
  /** 查找替换 */
  searchReplace: boolean;
  /** 强化 Office/WPS 粘贴（列表/MSO/Excel 等） */
  officePaste: boolean;
  /** 斜杠命令扩展 */
  slashCommand: boolean;
  /** 块拖拽手柄扩展 */
  dragHandle: boolean;
}

export interface ResolveExtensionGatesInput {
  features?: FeatureConfig;
}

/** 判断 features 中某项是否显式开启 */
export function isFeatureEnabled(
  features: FeatureConfig | undefined,
  key: keyof FeatureConfig,
): boolean {
  return features?.[key] === true;
}

/**
 * 解析扩展层应注册的能力
 *
 * 规则：传入值应为 preset 与 features 覆盖后的最终能力。
 */
export function resolveExtensionGates(
  input: ResolveExtensionGatesInput = {},
): ResolvedExtensionGates {
  const f = input.features;

  return {
    table: isFeatureEnabled(f, "table"),
    image: isFeatureEnabled(f, "image"),
    video: isFeatureEnabled(f, "video"),
    math: isFeatureEnabled(f, "math"),
    ai: isFeatureEnabled(f, "ai"),
    formatPainter: isFeatureEnabled(f, "formatPainter"),
    outline: isFeatureEnabled(f, "outline"),
    searchReplace: isFeatureEnabled(f, "searchReplace"),
    officePaste: isFeatureEnabled(f, "officePaste"),
    slashCommand: isFeatureEnabled(f, "slashCommand"),
    dragHandle: isFeatureEnabled(f, "dragHandle"),
  };
}
