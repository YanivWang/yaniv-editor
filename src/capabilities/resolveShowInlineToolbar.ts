import type { InlineToolbarConfig } from "@/configs/inlineTypes";

import type { CapabilityDefinition } from "./types";

/** 从 Registry 声明的 inlineToolbarSlugs 推导 Inline 工具栏是否应展示 */
export function resolveShowInlineToolbar(
  toolbar: InlineToolbarConfig | undefined,
  capabilities: ReadonlyArray<CapabilityDefinition>,
): boolean {
  if (!toolbar) return false;

  const slugs = new Set<string>();
  for (const cap of capabilities) {
    cap.inlineToolbarSlugs?.forEach((slug) => slugs.add(slug));
  }

  return [...slugs].some((key) => toolbar[key as keyof InlineToolbarConfig] === true);
}
