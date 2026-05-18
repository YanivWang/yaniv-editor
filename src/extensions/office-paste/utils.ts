/**
 * Office / WPS 剪贴 HTML 辅助（思路参考 Umo Editor office-paste，MIT）
 */

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

export function parseStyleAttribute(el: Element): Record<string, string> {
  const styleRaw = el.getAttribute("style") || "";
  const out: Record<string, string> = {};
  for (const line of styleRaw.split(";")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
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

export function replaceImageWithPlaceholder(html: string, placeholder: string): string {
  if (!html) return html;
  let next = html;
  next = next.replace(/<v:shape\b[^>]*>[\s\S]*?<v:imagedata[\s\S]*?<\/v:shape>/gi, placeholder);
  next = next.replace(/<v:imagedata\b[^>]*\/?>/gi, placeholder);
  next = next.replace(/<img\b[^>]*>/gi, placeholder);
  return next;
}

export function isOfficeLikeClipboardData(clipboardData: DataTransfer | null): boolean {
  if (!clipboardData) return false;
  const html = clipboardData.getData("text/html") || "";
  if (isOfficeHtml(html)) return true;
  const types = Array.from(clipboardData.types || []);
  return types.includes("text/rtf") || types.includes("application/rtf");
}
