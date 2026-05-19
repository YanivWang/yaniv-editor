/**
 * 扩展门控 → 工具栏开关映射
 */

import type { ToolbarToolsConfig } from "@/components/tools/header-nav/toolbarConfig";
import type { ResolvedExtensionGates } from "@/extensions/resolveExtensionGates";

/** 用扩展门控收敛工具栏配置，保证「扩展未注册则对应按钮不展示」 */
export function applyExtensionGatesToToolbarConfig(
  base: ToolbarToolsConfig,
  gates: ResolvedExtensionGates,
): ToolbarToolsConfig {
  return {
    ...base,
    table: !!(base.table && gates.table),
    image: !!(base.image && gates.image),
    math: !!(base.math && gates.math),
    formatPainter: !!(base.formatPainter && gates.formatPainter),
    ai: !!(base.ai && gates.ai),
    searchReplace: !!(base.searchReplace && gates.searchReplace),
    outline: !!(base.outline && gates.outline),
  };
}
