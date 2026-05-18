/**
 * Extensions - 扩展统一导出
 * @description 编辑器扩展的统一导出入口
 */

export { getExtensionsByVersion, getBasicExtensions } from "./coreExtensions";
export type { EditorVersion } from "./coreExtensions";
export { resolveExtensionGates } from "./resolveExtensionGates";
export type { ResolvedExtensionGates, ResolveExtensionGatesInput } from "./resolveExtensionGates";
export { OfficePaste } from "./office-paste";
export type { OfficePasteOptions } from "./office-paste";
export { SearchReplace, searchReplacePluginKey } from "./search-replace";
export type { SearchReplaceOptions } from "./search-replace";
export { FormatPainter, sampleFormats } from "./formatPainter";
export type { FormatPainterStorage, FormatPainterFormats } from "./formatPainter";
export { ResizableImage } from "./resizableImage";
export type { ResizableImageOptions } from "./resizableImage";
export * from "./pageConstants";
