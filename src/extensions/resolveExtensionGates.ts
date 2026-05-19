/**
 * 扩展功能门控 — 与 YanivEditor 的 version / features 对齐
 * @description 单一解析入口，避免「UI 关了但扩展仍注册」的不一致
 */

import type { EditorVersion, FeatureConfig } from "@/core/editorTypes";

/** 解析后的门控（全部显式布尔，供 getExtensionsByVersion 使用） */
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
  /** 与 YanivEditor.version / getExtensionsByVersion 一致 */
  version: EditorVersion;
  features?: FeatureConfig;
}

function isBasicTier(version: EditorVersion): boolean {
  return version === "basic";
}

/**
 * 解析扩展层应注册的能力
 *
 * 规则：
 * - table / image / math：显式 `false` 则不注册；默认 true
 * - ai：`features.ai === false` 则不注册；默认 true
 * - formatPainter / outline / searchReplace：显式 true/false 优先；未指定时 advanced 为 true，basic 为 false
 * - officePaste：默认 true；显式 false 关闭
 */
export function resolveExtensionGates(input: ResolveExtensionGatesInput): ResolvedExtensionGates {
  const { version, features: f } = input;

  const table = f?.table !== false;
  const image = f?.image !== false;
  const math = f?.math !== false;
  const ai = f?.ai !== false;

  let formatPainter: boolean;
  if (f?.formatPainter === true) {
    formatPainter = true;
  } else if (f?.formatPainter === false) {
    formatPainter = false;
  } else {
    formatPainter = !isBasicTier(version);
  }

  let outline: boolean;
  if (f?.outline === true) {
    outline = true;
  } else if (f?.outline === false) {
    outline = false;
  } else {
    outline = !isBasicTier(version);
  }

  let searchReplace: boolean;
  if (f?.searchReplace === true) {
    searchReplace = true;
  } else if (f?.searchReplace === false) {
    searchReplace = false;
  } else {
    searchReplace = !isBasicTier(version);
  }

  const officePaste = f?.officePaste !== false;

  return { table, image, math, ai, formatPainter, outline, searchReplace, officePaste };
}
