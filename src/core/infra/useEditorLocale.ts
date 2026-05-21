import { computed, inject, provide, watch, type InjectionKey, type Ref } from "vue";

import {
  ensureLocalesLoaded,
  loadLocale,
  normalizeLocaleCode,
  type LocaleCode,
} from "@/locales/manager";
import type { TiptapLocale } from "@/locales/types";

export interface EditorLocaleContext {
  locale: Ref<LocaleCode>;
  messages: Ref<TiptapLocale | null>;
  t: (key: string) => string;
}

export const editorLocaleKey: InjectionKey<EditorLocaleContext> = Symbol("editorLocale");

function getNested(obj: TiptapLocale | null, key: string): string | undefined {
  if (!obj) return undefined;
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in cur) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export function provideEditorLocale(localeSource: Ref<string | undefined>): EditorLocaleContext {
  const locale = computed(() => normalizeLocaleCode(localeSource.value));
  const messagesRef = { value: null as TiptapLocale | null };

  watch(
    locale,
    async (code) => {
      await ensureLocalesLoaded(code, "en-US");
      messagesRef.value = await loadLocale(code);
    },
    { immediate: true },
  );

  const ctx: EditorLocaleContext = {
    locale: computed(() => locale.value),
    messages: computed(() => messagesRef.value),
    t(key: string) {
      return getNested(messagesRef.value, key) ?? key;
    },
  };

  provide(editorLocaleKey, ctx);
  return ctx;
}

export function useEditorLocaleContext(): EditorLocaleContext {
  const ctx = inject(editorLocaleKey);
  if (!ctx) {
    throw new Error("[useEditorLocale] must be used within EditorShell");
  }
  return ctx;
}

/** Chrome 组件内读取实例 locale 文案（禁止 import 全局 t） */
export function useEditorT(): EditorLocaleContext["t"] {
  return useEditorLocaleContext().t;
}

export async function resolveLocaleMessages(localeCode: LocaleCode): Promise<TiptapLocale> {
  await ensureLocalesLoaded(localeCode, "en-US");
  return loadLocale(localeCode);
}
