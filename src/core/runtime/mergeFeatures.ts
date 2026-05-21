import type { FeatureConfig } from "@/core/editorTypes";

export function mergeFeatures(
  preset: Required<FeatureConfig>,
  overrides?: FeatureConfig,
): Required<FeatureConfig> {
  if (!overrides) return { ...preset };
  const merged = { ...preset };
  for (const key of Object.keys(overrides) as Array<keyof FeatureConfig>) {
    const v = overrides[key];
    if (v !== undefined) merged[key] = v;
  }
  return merged;
}
