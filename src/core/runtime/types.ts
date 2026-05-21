import type { FullEditorPresetConfig } from "@/configs/editorPreset";
import type { FeatureConfig, EditorMode, EditorPreset } from "@/core/editorTypes";
import type { LocaleCode } from "@/locales/types";

export type EditorPhase = EditorMode;
export type EditorShellHost = "full" | "inline";

export type ExtensionGates = Required<FeatureConfig> & Record<string, boolean>;

export interface EditorRuntimeProfile {
  mode: EditorPhase;
  preset: EditorPreset;
  features: Required<FeatureConfig>;
  gates: ExtensionGates;
}

export type PresetLayout = FullEditorPresetConfig["layout"];

export interface UiFlags {
  linkBubble: boolean;
  tableTools: boolean;
  image: boolean;
  video: boolean;
  floatingMenu: boolean;
}

export interface BaseChromePolicy {
  host: EditorShellHost;
  showEditChrome: boolean;
}

export interface FullChromePolicy extends BaseChromePolicy {
  host: "full";
  showHeader: boolean;
  showFooter: boolean;
  showOutlineRail: boolean;
  showContextualToolbars: boolean;
  showBlockPicker: boolean;
  showStatusHints: boolean;
}

export interface InlineChromePolicy extends BaseChromePolicy {
  host: "inline";
  showInlineToolbar: boolean;
  showLinkBubble: boolean;
}

export type ResolvedChromePolicy = FullChromePolicy | InlineChromePolicy;

export interface ResolveEditorProfileInput {
  mode?: EditorPhase;
  preset?: EditorPreset;
  features?: FeatureConfig;
}

export interface ResolveChromePolicyInput {
  profile: EditorRuntimeProfile;
  layout: PresetLayout;
  gates: ExtensionGates;
  uiFlags: UiFlags;
  host: EditorShellHost;
  showInlineToolbar?: boolean;
}

export type { LocaleCode };
export type { SessionStatus } from "@/core/session/types";
