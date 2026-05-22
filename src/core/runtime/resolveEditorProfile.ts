import type { FeatureConfig, EditorPreset } from "@/core/editorTypes";

import { mergeFeatures } from "./mergeFeatures";

import type { EditorRuntimeProfile, ExtensionGates, ResolveEditorProfileInput } from "./types";

const PRESET_DEFAULT_FEATURES: Record<EditorPreset, Required<FeatureConfig>> = {
  basic: {
    table: false,
    image: true,
    video: false,
    math: false,
    ai: false,
    formatPainter: false,
    outline: false,
    searchReplace: false,
    officePaste: false,
    slashCommand: false,
    dragHandle: false,
  },
  full: {
    table: true,
    image: true,
    video: true,
    math: true,
    ai: false,
    formatPainter: true,
    outline: true,
    searchReplace: true,
    officePaste: true,
    slashCommand: false,
    dragHandle: false,
  },
  notion: {
    table: true,
    image: true,
    video: true,
    math: true,
    ai: true,
    formatPainter: false,
    outline: true,
    searchReplace: true,
    officePaste: true,
    slashCommand: true,
    dragHandle: true,
  },
};

function featuresToGates(features: Required<FeatureConfig>): ExtensionGates {
  const gates = {} as ExtensionGates;
  for (const key of Object.keys(features) as Array<keyof FeatureConfig>) {
    gates[key] = features[key] === true;
  }
  return gates;
}

export function resolveEditorProfile(input: ResolveEditorProfileInput = {}): EditorRuntimeProfile {
  const preset = input.preset ?? "basic";
  const mode = input.mode ?? "edit";
  const presetDefaults = PRESET_DEFAULT_FEATURES[preset];
  const features = mergeFeatures(presetDefaults, input.features);
  const gates = featuresToGates(features);

  return {
    mode,
    preset,
    features,
    gates,
  };
}

export { PRESET_DEFAULT_FEATURES };
