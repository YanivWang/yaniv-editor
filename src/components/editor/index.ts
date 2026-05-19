/**
 * 编辑器专用 UI（依赖 Editor / 文档模型）
 * @description 与 `@/base` 区分；导入别名：`@/editor`。
 */

// —— 文本与段落 ——
export * from "./text-format";
export * from "./list";
export * from "./color";
export * from "./heading";
export * from "./align";
export * from "./image";

// Undo/Redo
export { UndoRedoButton as UndoRedoGroup } from "./undo-redo";

// Font
export { FontSizeSelect as FontSizeDropdown, FontFamilySelect } from "./font";
export { FontSize, LineHeight } from "./font";
export { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS, DEFAULT_VALUES } from "./font";

// Code Block
export { CodeBlockDropdown as CodeBlockButton } from "./code-block";

// Link
export { LinkButton } from "./link";

// Format Clear
export { ClearFormatButton as FormatClearButton } from "./format-clear";

// Format Painter
export { FormatPainterButton } from "./format-painter";

// Outline
export { OutlinePanel, OutlineToggleButton, provideOutlinePanel, useOutlinePanel } from "./outline";

// Subscript/Superscript
export { SubscriptSuperscriptButton as SubSupGroup } from "./subscript-superscript";

// Table
export * from "./table";

// Zoom
export * from "./zoom";

// Math
export { MathButton } from "./math";

// Word Import/Export
export { WordButton } from "./word";
export { importWordFile, convertWordToHtml, exportToWord } from "./word";

// Template
export { TemplateButton } from "./template";
export { builtinTemplates } from "./template";
export type { TemplateItem } from "./template";

// Gallery
export { GalleryButton } from "./gallery";
