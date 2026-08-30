const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const ALLOWED_MEDIA_PROTOCOLS = new Set(["http:", "https:", "blob:"]);

/**
 * 判断是否为**同文档 / 同源相对引用**：片段、查询串、绝对路径、相对路径。
 *
 * 这类地址不含协议，天然无法承载 `javascript:` / `data:` 之类的可执行 scheme，
 * 因此原样放行即可，**不能**去补 `https://`——补全会把 `/docs/page` 变成
 * 指向外部主机 `docs` 的 `https://docs/page`，把站内链接悄悄劫持到站外。
 *
 * 注意 `//` 必须排在 `/` 前面判断：`//evil.com` 是协议相对 URL（绝对地址），
 * 不是站内路径。
 */
function isSameDocumentReference(value: string): boolean {
  if (value.startsWith("//")) return false;
  return (
    value.startsWith("#") ||
    value.startsWith("?") ||
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../")
  );
}

export function normalizeSafeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // 锚点（#heading）、查询串与站内路径原样保留：
  // 目录跳转、mention 的 #page 这类链接都走这条路径，补全或拒绝都会造成内容丢失。
  if (isSameDocumentReference(trimmed)) return trimmed;

  const candidate =
    /^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith("//")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate, "https://yaniv.local");
    if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function normalizeSafeMediaUrl(rawUrl: string, kind: "image" | "video"): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (isSameDocumentReference(trimmed)) return trimmed;

  if (trimmed.startsWith("data:")) {
    const allowedPrefix = kind === "image" ? "data:image/" : "data:video/";
    return trimmed.startsWith(allowedPrefix) ? trimmed : null;
  }

  const candidate =
    /^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith("//")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate, "https://yaniv.local");
    if (!ALLOWED_MEDIA_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

const ALLOWED_FRAME_PROTOCOLS = new Set(["https:", "http:"]);

/**
 * iframe `src` 专用校验：仅允许 http/https。
 *
 * 不能复用 `normalizeSafeUrl`——它放行 `mailto:` / `tel:` 与站内相对地址，
 * 前两者对 iframe 无意义，后者会把宿主页面自己嵌进来（见下）。
 * 更关键的是 iframe 会创建新的 browsing context，协议白名单必须比链接更严格。
 * 且此处**不做** `https://` 自动补全：嵌入源必须由内容显式给出完整绝对地址，
 * 避免把 `javascript:alert(1)` 这类串意外补成看似合法的 URL。
 */
export function normalizeSafeFrameUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_FRAME_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}
