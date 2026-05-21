import type { CapabilityDefinition } from "@/capabilities/types";
import type { InlineToolbarConfig } from "@/configs/inlineTypes";

import type { ExtensionGates } from "./types";

export function resolveInlineGates(
  toolbar: InlineToolbarConfig,
  capabilities: ReadonlyArray<CapabilityDefinition>,
): ExtensionGates {
  const gates = {} as ExtensionGates & Record<string, boolean>;

  for (const cap of capabilities) {
    if (!cap.inlineToolbarSlugs?.length) continue;

    for (const slug of cap.inlineToolbarSlugs) {
      gates[slug] = toolbar[slug as keyof InlineToolbarConfig] === true;
    }

    const enabled = cap.inlineToolbarSlugs.some(
      (slug) => toolbar[slug as keyof InlineToolbarConfig] === true,
    );
    if (cap.featureKey) {
      gates[cap.featureKey] = enabled;
    } else if (!cap.id.startsWith("inline-")) {
      gates[cap.id] = enabled;
    }
  }

  return gates;
}
