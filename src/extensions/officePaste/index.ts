export { OfficePaste, type OfficePasteOptions } from "./officePaste";
export { isOfficeHtml, isOfficeLikeClipboardData } from "./utils";
export {
  applyOfficeHtmlTransforms,
  mergeOfficeHtmlTransforms,
  defaultOfficeHtmlTransformsConfig,
  transformExcelPaste,
} from "./pipeline";
export type { OfficeHtmlTransformsConfig, ApplyOfficeHtmlTransformsContext } from "./pipeline";
