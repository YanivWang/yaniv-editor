/**
 * Inline Editor presets — v-bind friendly, mirrors editorPresets pattern
 */
import type { InlinePresetProps, InlineToolbarConfig } from "./inlineTypes";

export type InlinePresetName = keyof typeof inlinePresets;

const richToolbar = {
  undoRedo: true,
  heading: true,
  textFormat: true,
  list: true,
  align: true,
  link: true,
  clearFormat: true,
  font: true,
  codeBlock: true,
} as const satisfies InlineToolbarConfig;

export const inlinePresets = {
  /** Undo + basic text marks */
  minimal: {
    toolbar: {
      undoRedo: true,
      textFormat: true,
    },
  },

  /** Comment box: formatting + links */
  comment: {
    toolbar: {
      undoRedo: true,
      textFormat: true,
      link: true,
    },
  },

  /** Form field: structure without undo */
  form: {
    toolbar: {
      heading: true,
      textFormat: true,
      list: true,
      align: true,
    },
  },

  /** All first-party inline toolbar tools */
  rich: {
    toolbar: richToolbar,
  },
} as const satisfies Record<string, InlinePresetProps>;

/** Merge preset with overrides; deep-merges toolbar keys */
export function mergeInlinePreset(
  preset: InlinePresetName,
  overrides?: Partial<InlinePresetProps>,
): InlinePresetProps {
  const base = inlinePresets[preset];
  return {
    toolbar: {
      ...base.toolbar,
      ...overrides?.toolbar,
    },
  };
}

/** Default toolbar when none is passed to YanivInlineEditor */
export const DEFAULT_INLINE_TOOLBAR: InlineToolbarConfig = inlinePresets.minimal.toolbar;
