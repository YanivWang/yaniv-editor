import { transformRemoveBookmarks } from "./transform/bookmark";
import { transformMsoHtmlClasses } from "./transform/htmlClasses";
import { transformRemoveLineNumberWrapper } from "./transform/lineNumber";
import { transformLists } from "./transform/lists";
import { transformMsoStyles } from "./transform/style";
import { replaceImageWithPlaceholder } from "./utils";

/**
 * Office HTML 粘贴流水线 — 每项可单独关闭（便于宿主逐项对齐或单测）
 */
export interface OfficeHtmlTransformsConfig {
  lists: boolean;
  bookmarks: boolean;
  msoStyles: boolean;
  msoHtmlClasses: boolean;
  lineNumber: boolean;
  imagePlaceholder: boolean;
}

export const defaultOfficeHtmlTransformsConfig: OfficeHtmlTransformsConfig = {
  lists: true,
  bookmarks: true,
  msoStyles: true,
  msoHtmlClasses: true,
  lineNumber: true,
  imagePlaceholder: true,
};

export function mergeOfficeHtmlTransforms(
  partial?: Partial<OfficeHtmlTransformsConfig>,
): OfficeHtmlTransformsConfig {
  return { ...defaultOfficeHtmlTransformsConfig, ...partial };
}

export interface ApplyOfficeHtmlTransformsContext {
  imagePlaceholderHtml: string;
  transforms: OfficeHtmlTransformsConfig;
}

/**
 * 对 Office 类 HTML 串执行 transform 链（不含 Excel 剪贴板分支，见 officePaste 插件 handlePaste）
 */
export function applyOfficeHtmlTransforms(
  html: string,
  ctx: ApplyOfficeHtmlTransformsContext,
): string {
  let next = html;
  const t = ctx.transforms;
  if (t.lists) next = transformLists(next);
  if (t.bookmarks) next = transformRemoveBookmarks(next);
  if (t.msoStyles) next = transformMsoStyles(next);
  if (t.msoHtmlClasses) next = transformMsoHtmlClasses(next);
  if (t.lineNumber) next = transformRemoveLineNumberWrapper(next);
  if (t.imagePlaceholder) next = replaceImageWithPlaceholder(next, ctx.imagePlaceholderHtml);
  return next;
}

/** Excel 表格粘贴处理 — 独立于 HTML 字符串流水线，便于单测或从入口关闭 */
export { transformExcelPaste } from "./transform/excel";
