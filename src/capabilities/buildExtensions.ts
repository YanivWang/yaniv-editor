import type { EditorShellHost } from "@/core/runtime/types";

import { CAPABILITIES } from "./registry";
import { withTransactionGuard } from "./transactionGuard";

import type { BuildExtensionsCtx, CapabilityDefinition } from "./types";
import type { Extension } from "@tiptap/core";

export { BYPASS_GUARD_META, withTransactionGuard } from "./transactionGuard";

export async function buildExtensions(
  host: EditorShellHost,
  ctx: BuildExtensionsCtx,
): Promise<Extension[]> {
  const enabled = CAPABILITIES.filter((c) =>
    host === "inline" ? c.id.startsWith("inline-") : !c.id.startsWith("inline-"),
  )
    .filter((c) => {
      if (host === "inline") {
        if (c.inlineAlways) return true;
        if (c.id === "inline-placeholder") return !!ctx.inlinePlaceholder;
        if (!c.inlineToolbarSlugs?.length) return false;
        return c.inlineToolbarSlugs.some((slug) => ctx.gates[slug] === true);
      }
      if (!c.featureKey) return true;
      return ctx.gates[c.featureKey] === true;
    })
    .sort((a, b) => a.order - b.order);

  const result: Extension[] = [];

  for (const cap of enabled) {
    const exts = await cap.extensions(ctx);
    const resolved = exts as Extension[];
    if (cap.tier === "interaction") {
      result.push(...resolved.map((ext) => withTransactionGuard(ext, ctx.isEditable)));
    } else {
      result.push(...resolved);
    }
  }

  return result;
}

export { CAPABILITIES };
export type { BuildExtensionsCtx, CapabilityDefinition };
