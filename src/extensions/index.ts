/**
 * Extensions - 扩展统一导出
 * @description 编辑器扩展的统一导出入口
 */

export { getExtensionsByVersion, getBasicExtensions } from "./coreExtensions";
export type { EditorVersion } from "./coreExtensions";
export { resolveExtensionGates } from "./resolveExtensionGates";
export type { ResolvedExtensionGates, ResolveExtensionGatesInput } from "./resolveExtensionGates";
export { OfficePaste } from "./officePaste";
export type { OfficePasteOptions } from "./officePaste";
export { SearchReplace, searchReplacePluginKey } from "./searchReplace";
export type { SearchReplaceOptions } from "./searchReplace";
export * from "./pageConstants";
