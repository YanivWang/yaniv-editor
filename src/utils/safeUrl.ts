const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const ALLOWED_MEDIA_PROTOCOLS = new Set(["http:", "https:", "blob:"]);

export function normalizeSafeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

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

  if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return trimmed;
  }

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
 * 不能复用 `normalizeSafeUrl`——它放行 `mailto:` / `tel:`，这两者对 iframe 无意义；
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
