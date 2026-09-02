/**
 * 把文本转义成可安全拼进 HTML 字符串的形式。
 *
 * 用于「文案 / 用户输入要拼成 HTML 串」的场合 —— 例如 KaTeX 的报错里原样带着用户
 * 输入的 LaTeX 片段，Office 粘贴的图片占位段要把 locale 文案包进 `<span>`。
 * 两处的文案都可能来自宿主（`createI18n({ messages })` 允许覆盖全部文案），
 * 不转义就等于把拼接点交给调用方。
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
