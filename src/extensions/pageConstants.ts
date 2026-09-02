/**
 * Page Constants - 页面常量配置
 * @description A4 页面高度，供页码统计使用。
 *
 * 页宽与内边距**不在这里**：它们是 `--ye-doc-*` 设计 token，
 * 由 `variables.css` 给基础值、`appearance/styles/*.css` 各自覆盖。
 * 此前这里还有 `A4_WIDTH_PX` / `PAGE_PADDING_*` / `PAGE_CONTENT_HEIGHT_PX`，
 * 唯一的用处是被 `initPageCssVariables()` 内联写回 DOM ——
 * 那反而盖掉了三套外观的尺寸设置（实测 default 的 900px 页宽被压成 794px）。
 */

/**
 * A4 纸张高度（像素）
 * A4 标准尺寸 210mm × 297mm，在 96 DPI 下为 794px × 1123px。
 */
export const A4_HEIGHT_PX = 1123;
