/**
 * 视觉外观与颜色模式类型
 */

/** 亮色、暗色或跟随系统 */
export type EditorColorMode = "light" | "dark" | "auto";

/**
 * 视觉外观
 * - default | word | notion：对应 src/appearance/styles/*.css
 * - custom：无 CSS 文件，用 customAppearanceVars 内联覆盖 --ye-*
 */
export type EditorAppearance = "default" | "word" | "notion" | "custom";
