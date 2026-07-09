/**
 * Yaniv Editor (@yanivjs/yaniv-editor)
 * Vue 3 + Tiptap 3 rich-text editor components and appearance utilities.
 */

export { default as YanivEditor } from "./core/YanivEditor.vue";
export type * from "./core/editorTypes";
export { provideYanivEditor, useYanivEditor } from "./core/editorContext";
export * from "./configs/editorConfig";

export type {
  EditorRuntimeProfile,
  ResolvedChromePolicy,
  EditorShellHost,
  EditorPhase,
  ExtensionGates,
} from "./core/runtime/types";

export { mergeFeatures } from "./core/runtime/mergeFeatures";
export { resolveEditorProfile } from "./core/runtime/resolveEditorProfile";
export { resolveChromePolicy } from "./core/runtime/resolveChromePolicy";
export { computeSessionKey } from "./core/runtime/computeSessionKey";
export { resolveInlineGates } from "./core/runtime/resolveInlineGates";
export { buildExtensions, BYPASS_GUARD_META } from "./capabilities/buildExtensions";
export { CAPABILITIES } from "./capabilities/registry";
export { applyGatesToToolbarConfig } from "./capabilities/applyGatesToToolbarConfig";
export { resolveShowInlineToolbar } from "./capabilities/resolveShowInlineToolbar";
export type { CapabilityDefinition, BuildExtensionsCtx } from "./capabilities/types";
export {
  ContentAdapter,
  adaptJsonToSchema,
  parseContentToDoc,
  prepareEditorContent,
} from "./core/session/contentAdapter";
export { applyPhaseTransition } from "./core/session/applyPhaseTransition";
export type { SessionStatus, PhaseChangeEvent } from "./core/session/types";

export * from "./appearance";
export * from "./locales";
export * from "./composables";
