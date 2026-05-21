/**
 * Yaniv Editor (@yanivjs/yaniv-editor)
 * Vue 3 + Tiptap 3 rich-text editor components and appearance utilities.
 */

// Core Editor
export { default as YanivEditor } from "./core/YanivEditor.vue";
export type * from "./core/editorTypes";
export { provideYanivEditor, useYanivEditor } from "./core/editorContext";
export * from "./configs/editorConfig";
export { applyExtensionGatesToToolbarConfig } from "./configs/editorCapabilityMap";
export { buildEditorExtensions } from "./extensions";

// Appearance and color utilities
export * from "./appearance";

// Locales
export * from "./locales";

// AI Module
export * from "./features/ai";

// Extension feature gates（高级接入：与编辑器 props 对齐）
export { resolveExtensionGates, isFeatureEnabled } from "./extensions/resolveExtensionGates";
export type {
  ResolvedExtensionGates,
  ResolveExtensionGatesInput,
} from "./extensions/resolveExtensionGates";

// Composables（快捷键、滚动等与 UI 框架解耦的横切能力）
export * from "./composables";
