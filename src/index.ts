/**
 * Tiptap UI Kit
 * Beautiful Tiptap 3 + Vue 3 rich-text editor theme
 */

// Core Editor
export { default as TiptapProEditor } from "./core/TiptapProEditor.vue";
export type * from "./core/editorTypes";
export * from "./core/editorConfig";
export {
  applyExtensionGatesToToolbarConfig,
  CAPABILITY_TO_GATE,
  type EditorCapabilityId,
} from "./core/editorCapabilityMap";

// Themes
export * from "./themes";

// Locales
export * from "./locales";

// Adapters
export * from "./adapters";

// AI Module
export * from "./ai";

// Extension feature gates（高级接入：与编辑器 props 对齐）
export { resolveExtensionGates } from "./extensions/resolveExtensionGates";
export type {
  ResolvedExtensionGates,
  ResolveExtensionGatesInput,
} from "./extensions/resolveExtensionGates";

// Composables（快捷键、滚动等与 UI 框架解耦的横切能力）
export * from "./composables";

// Styles - users import separately:
// import 'tiptap-ui-kit/style.css'
