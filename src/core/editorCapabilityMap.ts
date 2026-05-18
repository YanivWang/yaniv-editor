/**
 * 编辑器「能力」注册表 — 对齐扩展门控、FeatureConfig、工具栏开关（避免散落在多处）
 * @description 单一数据入口描述「能力 id → 扩展层 gate → 工具栏 config 键」的对应关系
 */

import type { ResolvedExtensionGates } from "@/extensions/resolveExtensionGates";
import type { ToolbarToolsConfig } from "@/tools/header-nav/toolbarConfig";

/** 与扩展/UI 对齐的能力标识（便于文档与后续 dict 驱动） */
export type EditorCapabilityId =
  | "table"
  | "image"
  | "math"
  | "ai"
  | "formatPainter"
  | "outline"
  | "searchReplace"
  | "officePaste"
  | "textFormat"
  | "colorPicker"
  | "heading"
  | "list"
  | "align"
  | "codeBlock"
  | "link"
  | "undoRedo"
  | "clearFormat"
  | "font"
  | "lineHeight"
  | "subscriptSuperscript"
  | "word"
  | "template"
  | "gallery"
  | "findReplace";

/**
 * 用 `resolveExtensionGates` 收敛工具栏配置，保证「扩展未注册则对应按钮不展示」
 *
 * - `findReplace`（工具栏）↔ `searchReplace`（扩展 gate）
 * - `base.findReplace === false` 时尊重宿主强制关闭工具栏入口（仍注册扩展时仅隐藏 UI）
 */
export function applyExtensionGatesToToolbarConfig(
  base: ToolbarToolsConfig,
  gates: ResolvedExtensionGates,
): ToolbarToolsConfig {
  return {
    ...base,
    table: !!(base.table && gates.table),
    image: !!(base.image && gates.image),
    formatPainter: !!(base.formatPainter && gates.formatPainter),
    ai: !!(base.ai && gates.ai),
    findReplace: base.findReplace !== false && gates.searchReplace,
  };
}

/**
 * 能力 → 扩展门控字段（文档用）；仅存扩展层能力，纯 UI 开关无对应 gate
 */
export const CAPABILITY_TO_GATE: Partial<Record<EditorCapabilityId, keyof ResolvedExtensionGates>> =
  {
    table: "table",
    image: "image",
    math: "math",
    ai: "ai",
    formatPainter: "formatPainter",
    outline: "outline",
    searchReplace: "searchReplace",
    officePaste: "officePaste",
    findReplace: "searchReplace",
  };
