/**
 * Editor Constants
 * @description 工具栏控件的可选项常量（字体、字号、段落样式、代码语言）。
 *
 * 约定：**这里只放真的有消费方的常量**。曾经堆过一批「看起来像配置、实际没人读」的清单
 * （色板、对齐项、表格边框、缩放上限、快捷键表），它们改了不会有任何效果，
 * 反而误导接入方以为是可调参数——已全部删除。新增常量前先确认有调用点。
 *
 * 工具栏与菜单类型请从 `@/configs/toolbarTypes` 导入。
 */

/**
 * 字体系列选项 — `FontFamilySelect` 的下拉项。
 */
export const FONT_FAMILIES = [
  { label: "PMingLiU", value: "PMingLiU" },
  { label: "Microsoft YaHei", value: "Microsoft YaHei" },
  { label: "SimSun", value: "SimSun" },
  { label: "SimHei", value: "SimHei" },
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Monospace", value: "monospace" },
] as const;

/**
 * 字号选项 — `FontSizeSelect` 的下拉项（值为 CSS px，label 为去掉单位的数字）。
 */
export const FONT_SIZES = [
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
] as const;

/**
 * 段落样式选项 — `HeadingControl` 的下拉项（label 由 i18n `editor.{value}` 提供）。
 */
export const HEADING_OPTIONS = [
  { value: "paragraph" },
  { value: "h1" },
  { value: "h2" },
  { value: "h3" },
  { value: "h4" },
  { value: "h5" },
  { value: "h6" },
] as const;

/** 代码块默认语言 */
export const DEFAULT_CODE_BLOCK_LANGUAGE = "javascript";

/**
 * 代码块语言选项 — 语言选择器（`CodeBlockDropdown` / `CodeBlockLanguageBadge`）的可选项。
 * @remarks 这是 UI 列表，不是高亮能力范围：实际高亮由 lowlight `common` 语言包提供，
 * 覆盖面更广；`html` 是 `codeBlockLowlight.ts` 为 `xml` 额外注册的别名。
 */
export const CODE_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "html",
  "css",
  "json",
  "bash",
  "sql",
  "php",
  "go",
  "rust",
  "c",
  "cpp",
  "csharp",
  "swift",
  "kotlin",
  "ruby",
  "markdown",
  "xml",
] as const;

/**
 * 字体控件读不到当前 mark 时的回显值。
 * @remarks 只服务 `FontFamilySelect` / `FontSizeSelect`，不是「编辑器默认样式」——
 * 真正的默认排版来自 `appearance/styles/*.css` 的 token。
 */
export const DEFAULT_VALUES = {
  /** 默认字体 */
  fontFamily: "PMingLiU",
  /** 默认字号 */
  fontSize: "16px",
} as const;
