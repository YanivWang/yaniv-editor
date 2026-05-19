/**
 * 扩展功能门控 — 与 YanivEditor features 对齐
 * @description 单一解析入口，避免「UI 关了但扩展仍注册」的不一致
 */

import type { FeatureConfig } from "@/core/editorTypes";

/** 解析后的门控（全部显式布尔，供 buildEditorExtensions 使用） */
export interface ResolvedExtensionGates {
  table: boolean;
  image: boolean;
  math: boolean;
  ai: boolean;
  formatPainter: boolean;
  /** 标题 UniqueID + 目录扩展 */
  outline: boolean;
  /** 查找替换 */
  searchReplace: boolean;
  /** 强化 Office/WPS 粘贴（列表/MSO/Excel 等） */
  officePaste: boolean;
}

export interface ResolveExtensionGatesInput {
  features?: FeatureConfig;
}

/**
 * 解析扩展层应注册的能力
 *
 * 规则：未在 features 中声明的项默认开启；显式 `false` 则关闭。
 */
export function resolveExtensionGates(
  input: ResolveExtensionGatesInput = {},
): ResolvedExtensionGates {
  const f = input.features;

  return {
    table: f?.table !== false,
    image: f?.image !== false,
    math: f?.math !== false,
    ai: f?.ai !== false,
    formatPainter: f?.formatPainter !== false,
    outline: f?.outline !== false,
    searchReplace: f?.searchReplace !== false,
    officePaste: f?.officePaste !== false,
  };
}
