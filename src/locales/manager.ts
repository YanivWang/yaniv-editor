/**
 * i18n Manager
 * Standalone internationalization system (no external deps)
 */

import { computed, ref, shallowRef } from "vue";

import type { LocaleCode, TiptapLocale } from "./types";

export type { LocaleCode } from "./types";
export type LocaleMessages = TiptapLocale;

export const BUILTIN_LOCALE_CODES = ["zh-CN", "en-US"] as const satisfies readonly LocaleCode[];

const localeLoaders: Record<LocaleCode, () => Promise<LocaleMessages>> = {
  "zh-CN": async () => (await import("./zh-CN")).zhCN,
  "en-US": async () => (await import("./en-US")).enUS,
};

const localeCache = shallowRef<Partial<Record<LocaleCode, LocaleMessages>>>({});
const loadingLocales = new Map<LocaleCode, Promise<LocaleMessages>>();

/** Bumped after locale messages load so editor UI re-renders translated strings. */
export const localeGeneration = ref(0);

const currentLocale = ref<LocaleCode>("zh-CN");
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
 * Get nested value from object by dot-separated key
 */
function getNestedValue(
  obj: LocaleMessages | Record<string, LocaleMessages> | undefined,
  key: string,
): string {
  if (!obj) return key;

  const keys = key.split(".");
  let result: unknown = obj;

  for (const k of keys) {
    if (result === undefined || result === null || typeof result !== "object") {
      return key;
    }
    result = (result as Record<string, unknown>)[k];
  }

  return typeof result === "string" ? result : key;
}

/**
 * Translate a key with optional interpolation
 */
export function t(key: string, params?: Record<string, string | number>): string {
  localeGeneration.value;

  const locale = currentLocale.value;
  let result = key;

  if (customMessages.value[locale]) {
    const custom = getNestedValue(customMessages.value[locale], key);
    if (custom !== key) result = custom;
  }

  if (result === key) {
    const builtIn = getBuiltinMessages(locale);
    if (builtIn) {
      const builtInResult = getNestedValue(builtIn, key);
      if (builtInResult !== key) result = builtInResult;
    }
  }

  if (result === key && locale !== "en-US") {
    const fallback = getBuiltinMessages("en-US");
    if (fallback) {
      const fallbackResult = getNestedValue(fallback, key);
      if (fallbackResult !== key) result = fallbackResult;
    }
  }

  if (params && result !== key) {
    Object.entries(params).forEach(([paramKey, value]) => {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
    });
  }

  return result;
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
  const fallbackLocale = options?.fallbackLocale ?? "en-US";

  currentLocale.value = locale;
  if (options?.messages) {
    customMessages.value = options.messages;
  }

  void ensureLocalesLoaded(locale, fallbackLocale);
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
