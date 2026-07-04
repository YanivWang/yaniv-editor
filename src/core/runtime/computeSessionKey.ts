import type { CapabilityDefinition } from "@/capabilities/types";

import type { EditorRuntimeProfile, EditorShellHost, LocaleCode } from "./types";

export function computeSessionKey(
  profile: EditorRuntimeProfile,
  host: EditorShellHost,
  locale: LocaleCode,
  capabilities: ReadonlyArray<CapabilityDefinition>,
  runtimeSignature = "",
): string {
  const enabledCaps = capabilities
    .filter((c) => !c.featureKey || profile.gates[c.featureKey])
    .filter((c) => (host === "inline" ? !!c.inlineToolbarSlugs?.length : true))
    .sort((a, b) => a.order - b.order);

  const gateIds = enabledCaps.map((c) => c.id).join(",");
  const enabledGateEntries = Object.entries(profile.gates)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key)
    .sort()
    .join(",");

  const schemaSignatures = enabledCaps
    .map((c) => c.schemaSignature?.(profile) ?? "")
    .filter(Boolean)
    .join("|");

  return `${host}|${locale}|${gateIds}|${enabledGateEntries}|${schemaSignatures}|${runtimeSignature}`;
}
