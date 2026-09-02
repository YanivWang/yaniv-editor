/**
 * Math Rendering
 * @description KaTeX 渲染的纯函数封装，供 MathNodeView 使用。
 *
 * **为什么独立成模块**：渲染结果与「是否出错」必须由同一次调用一起产出。
 * 早先的实现把错误写进组件里的 `ref`，而调用点是两个 `computed`
 * （显示态 / 编辑态预览），于是模板先读 `renderError` 再决定要不要读 `previewHtml`：
 * 一旦出错，`v-if` 分支不再求值预览 computed，也就再没人把错误清回 null，
 * 错误提示会一直粘住、预览再也回不来。这里返回 `{ html, error }`，
 * 让两者同源，组件侧只做纯派生，从结构上杜绝这类粘滞状态。
 */
import katex from "katex";

import { escapeHtml } from "@/utils/escapeHtml";

import { DEFAULT_KATEX_OPTIONS } from "./types";

import type { KatexRenderOptions } from "./types";

export interface MathRenderResult {
  /** 可直接注入 `v-html` 的 HTML 片段 */
  html: string;
  /** 渲染失败时的错误文案；成功为 `null` */
  error: string | null;
}

/**
 * 渲染 LaTeX。
 *
 * @param latex 公式源码；非字符串（来自宿主传入的畸形 JSON）按空串处理
 * @param displayMode 块级公式为 `true`
 * @param options 扩展选项里的 KaTeX 配置，缺省项由 `DEFAULT_KATEX_OPTIONS` 补齐
 * @param emptyLabel 公式为空时显示的占位文案（由调用方从 i18n 取，保证跟随语言切换）
 */
export function renderMath(
  latex: unknown,
  displayMode: boolean,
  options: KatexRenderOptions | undefined,
  emptyLabel: string,
): MathRenderResult {
  const source = typeof latex === "string" ? latex : "";

  if (!source.trim()) {
    return {
      html: `<span class="math-placeholder">${escapeHtml(emptyLabel)}</span>`,
      error: null,
    };
  }

  try {
    return {
      html: katex.renderToString(source, {
        ...DEFAULT_KATEX_OPTIONS,
        ...options,
        displayMode,
      }),
      error: null,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Render error";
    return { html: `<span class="math-error">${escapeHtml(error)}</span>`, error };
  }
}
