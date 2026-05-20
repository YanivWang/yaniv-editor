import { computed, watch, type MaybeRefOrGetter, toValue } from "vue";

import { createI18n, useI18n as useTiptapI18n, type LocaleCode } from "@/locales";

function mapLocaleToTiptapLocale(locale: string): LocaleCode {
  const localeMap: Record<string, LocaleCode> = {
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    "zh-HK": "zh-TW",
    "en-US": "en-US",
    en: "en-US",
  };
  if (localeMap[locale]) return localeMap[locale];
  if (locale.startsWith("zh")) {
    return locale.includes("TW") || locale.includes("HK") ? "zh-TW" : "zh-CN";
  }
  if (locale.startsWith("en")) return "en-US";
  return "zh-CN";
}

export function useEditorLocale(localeSource: MaybeRefOrGetter<string | undefined>) {
  const currentLocale = computed(() => toValue(localeSource) || "zh-CN");

  const initTiptapI18n = () => {
    const tiptapLocale = mapLocaleToTiptapLocale(currentLocale.value);
    createI18n({ locale: tiptapLocale, fallbackLocale: "en-US" });
  };

  initTiptapI18n();

  watch(
    () => currentLocale.value,
    (newLocale) => {
      const tiptapLocale = mapLocaleToTiptapLocale(newLocale);
      const tiptapI18n = useTiptapI18n();
      tiptapI18n.setLocale(tiptapLocale);
    },
    { immediate: false },
  );
}
