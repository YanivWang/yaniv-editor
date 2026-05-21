import type { ToolbarToolsConfig } from "@/components/tools/header-nav/toolbarConfig";
import type { ExtensionGates } from "@/core/runtime/types";

import { CAPABILITIES } from "./registry";

import type { CapabilityDefinition } from "./types";

function buildToolbarGateMap(
  capabilities: ReadonlyArray<CapabilityDefinition>,
): Map<keyof ToolbarToolsConfig, string> {
  const map = new Map<keyof ToolbarToolsConfig, string>();

  for (const cap of capabilities) {
    if (!cap.fullToolbarSlugs?.length) continue;
    const gateKey = cap.featureKey ?? cap.id;
    for (const slug of cap.fullToolbarSlugs) {
      const key = slug as keyof ToolbarToolsConfig;
      if (!map.has(key)) map.set(key, gateKey);
    }
  }

  return map;
}

const TOOLBAR_GATE_MAP = buildToolbarGateMap(CAPABILITIES);

/** 用 Capability Registry 的 fullToolbarSlugs 收敛工具栏配置 */
export function applyGatesToToolbarConfig(
  base: ToolbarToolsConfig,
  gates: ExtensionGates,
): ToolbarToolsConfig {
  const result: ToolbarToolsConfig = { ...base };

  for (const [slug, gateKey] of TOOLBAR_GATE_MAP) {
    if (result[slug]) {
      result[slug] = !!(result[slug] && gates[gateKey] === true);
    }
  }

  return result;
}
