/**
 * Math Extension Types
 * @description 数学公式编辑器类型定义
 */

export interface MathNodeAttrs {
  /** LaTeX 公式内容 */
  latex: string;
  /** 是否为块级公式 */
  block: boolean;
}

export interface MathExtensionOptions {
  /** 是否启用行内公式 */
  inline?: boolean;
  /** 是否启用块级公式 */
  block?: boolean;
  /** KaTeX 渲染选项 */
  katexOptions?: KatexRenderOptions;
}

export interface KatexRenderOptions {
  /**
   * 遇到非法 LaTeX 时是否抛错。
   * `false`（缺省）时 KaTeX 不抛错，而是用 `errorColor` 就地渲染出错的源码；
   * `true` 时交由 NodeView 捕获并显示错误文案。
   */
  throwOnError?: boolean;
  /** 错误颜色 */
  errorColor?: string;
  /** 是否使用严格模式 */
  strict?: boolean | "error" | "ignore" | "warn";
  /** 是否信任输入 */
  trust?: boolean;
  /** 宏定义 */
  macros?: Record<string, string>;
}

export const DEFAULT_KATEX_OPTIONS: KatexRenderOptions = {
  throwOnError: false,
  errorColor: "#cc0000",
  strict: false,
  trust: false,
};
