const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

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
