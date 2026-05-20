import { computed, watch, type MaybeRefOrGetter, toValue } from "vue";

import {
  createI18n,
  ensureLocalesLoaded,
  localeGeneration,
  normalizeLocaleCode,
  type LocaleCode,
} from "@/locales";

export function useEditorLocale(localeSource: MaybeRefOrGetter<string | undefined>) {
  const currentLocale = computed(() => toValue(localeSource) || "zh-CN");

  async function applyLocale(raw: string) {
    const tiptapLocale = normalizeLocaleCode(raw);
    await ensureLocalesLoaded(tiptapLocale, "en-US");
    createI18n({ locale: tiptapLocale, fallbackLocale: "en-US" });
  }

  watch(
    currentLocale,
    (newLocale) => {
      void applyLocale(newLocale);
    },
    { immediate: true },
  );

  return {
    localeEpoch: localeGeneration,
    resolveLocale: (raw?: string): LocaleCode => normalizeLocaleCode(raw ?? currentLocale.value),
    whenLocaleReady: () => ensureLocalesLoaded(normalizeLocaleCode(currentLocale.value), "en-US"),
  };
}
