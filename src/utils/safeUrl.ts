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

/**
 * 无协议的值是否该当作「省略了 https:// 的绝对地址」。
 *
 * 只认 `host.tld/path` 这一种形状：**首段含点且后面还有路径**。
 * `a.png`（没有 `/`，就是个文件名）与 `images/a.png`（首段不含点）都判为相对路径。
 *
 * 媒体 src 与链接的取舍不同：链接里用户手打 `example.com/x` 期望补成 https，
 * 而媒体 src 几乎不会写成裸域名，`a.png` 这类**一定**是相对路径——
 * 一律补 `https://` 会把它变成指向外部主机 `a.png` 的地址，图片直接失效，
 * 且这个被改坏的值会经 `getJSON()` 回到宿主并被持久化。
 * 这正是 {@link isSameDocumentReference} 注释里那条理由（补全会把站内引用劫持到站外）
 * 在「不带前导 `/`」的相对路径上的同一情形。
 */
function looksLikeHostWithPath(value: string): boolean {
  const slash = value.indexOf("/");
  if (slash <= 0) return false;
  return value.slice(0, slash).includes(".");
}

export function normalizeSafeMediaUrl(rawUrl: string, kind: "image" | "video"): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (isSameDocumentReference(trimmed)) return trimmed;

  if (trimmed.startsWith("data:")) {
    const allowedPrefix = kind === "image" ? "data:image/" : "data:video/";
    return trimmed.startsWith(allowedPrefix) ? trimmed : null;
  }

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  const isProtocolRelative = trimmed.startsWith("//");

  // 无协议且不像域名的，按相对路径原样保留：不含协议就不可能承载可执行 scheme，
  // 与 `isSameDocumentReference` 放行 `./a.png` 的理由一致。
  if (!hasScheme && !isProtocolRelative && !looksLikeHostWithPath(trimmed)) {
    return trimmed;
  }

  const candidate = hasScheme || isProtocolRelative ? trimmed : `https://${trimmed}`;

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
