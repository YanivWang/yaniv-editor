/**
 * Office / WPS 剪贴 HTML 辅助（思路参考 Umo Editor office-paste）
 */
import { TAG_INNARDS } from "@/utils/htmlTagPattern";

export function parseRomanNumber(roman: string): number {
  const r = roman.toUpperCase();
  let value = 0;
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let i = r.length;
  let lastVal = 0;
  while (i--) {
    const ch = r.charAt(i);
    const v = values[ch] ?? 0;
    if (v >= lastVal) value += v;
    else value -= v;
    lastVal = v;
  }
  return value;
}

export function parseLetterNumber(str: string): number {
  const alphaVal = (s: string) => s.toLowerCase().charCodeAt(0) - 97 + 1;
  let value = 0;
  let i = str.length;
  while (i--) {
    const factor = 26 ** (str.length - i - 1);
    value += alphaVal(str.charAt(i)) * factor;
  }
  return value;
}

export function unwrapNode(node: Node): void {
  const parent = node.parentNode;
  if (!parent) return;
  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node);
  }
  parent.removeChild(node);
}

/**
 * 按**顶层** `;` 切分 CSS 声明串。
 *
 * 不能直接 `split(";")`：`;` 在括号与引号内部是普通字符，
 * `background:url(data:image/png;base64,AAA)` 或 `font-family:"a;b"` 会被切碎，
 * 而调用方（`transformMsoStyles`）会把切分结果重新 join 回 style 属性，
 * 于是分号后面的部分被静默丢弃 —— 那是内容损坏，不只是解析不准。
 */
export function splitCssDeclarations(cssText: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let start = 0;

  for (let i = 0; i < cssText.length; i++) {
    const ch = cssText[i];
    if (quote) {
      // CSS 字符串里的 \" / \' 是转义，不结束引号
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === ";" && depth === 0) {
      out.push(cssText.slice(start, i));
      start = i + 1;
    }
  }
  out.push(cssText.slice(start));
  return out;
}

/** 把一段 CSS 声明串解析成 `属性 → 值` 表（属性与值均已 trim） */
export function parseCssDeclarations(cssText: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of splitCssDeclarations(cssText)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

export function parseStyleAttribute(el: Element): Record<string, string> {
  return parseCssDeclarations(el.getAttribute("style") || "");
}

export function isOfficeHtml(html: string): boolean {
  if (!html) return false;
  const n = html.toLowerCase();
  const hasMsOfficeSignature =
    (n.includes("microsoft-com") && n.includes("office")) ||
    n.includes("urn:schemas-microsoft-com:office") ||
    n.includes("class=mso") ||
    n.includes('class="mso') ||
    n.includes("mso-") ||
    n.includes("w:worddocument");

  const hasWpsSignature =
    n.includes("wps office") ||
    n.includes("kingsoft") ||
    n.includes("xmlns:wps") ||
    n.includes('name="generator" content="wps');

  return hasMsOfficeSignature || hasWpsSignature;
}

export function hasImageInPastePayload(files: File[], html: string): boolean {
  const hasImageFile = files.some((item) => item.type?.startsWith("image/"));
  const hasImageTag = /<(img\b|v:imagedata\b)/i.test(html || "");
  return hasImageFile || hasImageTag;
}

const V_SHAPE_BLOCK = new RegExp(
  `<v:shape\\b${TAG_INNARDS}>[\\s\\S]*?<v:imagedata[\\s\\S]*?</v:shape>`,
  "gi",
);
const V_IMAGEDATA_TAG = new RegExp(`<v:imagedata\\b${TAG_INNARDS}/?>`, "gi");
const IMG_TAG = new RegExp(`<img\\b${TAG_INNARDS}>`, "gi");

export function replaceImageWithPlaceholder(html: string, placeholder: string): string {
  if (!html) return html;
  // 用函数形式而不是字符串形式：`placeholder` 来自公开的 `imagePlaceholderHtml` 选项，
  // 字符串形式下其中的 `$&` / `$'` / `` $` `` 会被当成替换模式展开，
  // 把刚刚摘掉的原始 <img> 标签又原样塞回文档。
  const insert = () => placeholder;
  let next = html;
  next = next.replace(V_SHAPE_BLOCK, insert);
  next = next.replace(V_IMAGEDATA_TAG, insert);
  next = next.replace(IMG_TAG, insert);
  return next;
}

export function isOfficeLikeClipboardData(clipboardData: DataTransfer | null): boolean {
  if (!clipboardData) return false;
  const html = clipboardData.getData("text/html") || "";
  if (isOfficeHtml(html)) return true;
  const types = Array.from(clipboardData.types || []);
  return types.includes("text/rtf") || types.includes("application/rtf");
}
