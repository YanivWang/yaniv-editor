/**
 * i18n Manager
 * Standalone internationalization system (no external deps)
 */

import { computed, ref, shallowRef } from "vue";

import { interpolate, resolveMessage } from "./resolveMessage";

import type { LocaleCode, TiptapLocale } from "./types";

export type { LocaleCode } from "./types";
export type LocaleMessages = TiptapLocale;

export const BUILTIN_LOCALE_CODES = ["zh-CN", "en-US"] as const satisfies ReadonlyArray<LocaleCode>;

const localeLoaders: Record<LocaleCode, () => Promise<LocaleMessages>> = {
  "zh-CN": async () => (await import("./zh-CN")).zhCN,
  "en-US": async () => (await import("./en-US")).enUS,
};

const localeCache = shallowRef<Partial<Record<LocaleCode, LocaleMessages>>>({});
const loadingLocales = new Map<LocaleCode, Promise<LocaleMessages>>();

/** Internal bump counter so global `t()` re-renders after locale loads; not part of public API. */
const localeGeneration = ref(0);

const currentLocale = ref<LocaleCode>("zh-CN");
/** `createI18n({ fallbackLocale })` 写在这里，`t()` 才能读到——只存在 `createI18n` 的局部变量里时，
 * 该选项只影响预加载、不影响解析，等于被静默忽略。 */
const fallbackLocale = ref<LocaleCode>("en-US");
const customMessages = ref<Record<string, LocaleMessages>>({});

/**
 * Map host locale strings to built-in locale codes (zh-CN | en-US only).
 */
export function normalizeLocaleCode(locale: string | undefined): LocaleCode {
  const localeMap: Record<string, LocaleCode> = {
    "zh-CN": "zh-CN",
    "zh-TW": "zh-CN",
    "zh-HK": "zh-CN",
    "en-US": "en-US",
    en: "en-US",
  };
  if (locale && localeMap[locale]) return localeMap[locale];
  if (locale?.startsWith("zh")) return "zh-CN";
  if (locale?.startsWith("en")) return "en-US";
  return "zh-CN";
}

export async function loadLocale(locale: LocaleCode): Promise<LocaleMessages> {
  const cached = localeCache.value[locale];
  if (cached) return cached;

  const pending = loadingLocales.get(locale);
  if (pending) return pending;

  const promise = localeLoaders[locale]().then((messages) => {
    localeCache.value = { ...localeCache.value, [locale]: messages };
    loadingLocales.delete(locale);
    localeGeneration.value += 1;
    return messages;
  });
  loadingLocales.set(locale, promise);
  return promise;
}

/** Load locale files for the active locale and fallback (deduped). */
export async function ensureLocalesLoaded(
  locale: LocaleCode,
  fallbackLocale: LocaleCode = "en-US",
): Promise<void> {
  const toLoad = new Set<LocaleCode>([locale, fallbackLocale]);
  await Promise.all([...toLoad].map((code) => loadLocale(code)));
}

function getBuiltinMessages(locale: LocaleCode): LocaleMessages | undefined {
  return localeCache.value[locale];
}

/**
 * Translate a key with optional interpolation
 */
export function t(key: string, params?: Record<string, string | number>): string {
  void localeGeneration.value;

  const locale = currentLocale.value;
  const fallback = fallbackLocale.value;

  // 当前 locale（自定义包 → 内置包）→ 兜底 locale（自定义包 → 内置包）。
  // `resolveMessage` 未命中返回 undefined，因此这里用 ?? 串联即可；旧写法拿
  // 「返回值 === key」当未命中哨兵，译文恰好等于 key 时会被误判为没查到而继续往下找。
  //
  // 兜底段必须也查 `customMessages`：内置包两份由 localeParity.test.ts 保证 key 集合
  // 完全一致，缺 key 只可能出现在自定义包里——只查内置包的话这一段永远命不中。
  const result =
    resolveMessage(customMessages.value[locale], key) ??
    resolveMessage(getBuiltinMessages(locale), key) ??
    (fallback === locale
      ? undefined
      : (resolveMessage(customMessages.value[fallback], key) ??
        resolveMessage(getBuiltinMessages(fallback), key)));

  if (result === undefined) return key;

  return interpolate(result, params);
}

/**
 * Create i18n instance (sync; loads locale files asynchronously).
 */
export function createI18n(options?: {
  locale?: LocaleCode;
  fallbackLocale?: LocaleCode;
  messages?: Record<string, LocaleMessages>;
}) {
  const locale = options?.locale ?? currentLocale.value;
  const fallback = options?.fallbackLocale ?? "en-US";

  currentLocale.value = locale;
  fallbackLocale.value = fallback;
  if (options?.messages) {
    customMessages.value = options.messages;
  }

  void ensureLocalesLoaded(locale, fallback);
}

/**
 * Use i18n composable
 */
export function useI18n() {
  return {
    t,
    locale: computed(() => currentLocale.value),
    setLocale: async (locale: LocaleCode) => {
      await loadLocale(locale);
      currentLocale.value = locale;
    },
    availableLocales: [...BUILTIN_LOCALE_CODES] as LocaleCode[],
  };
}
