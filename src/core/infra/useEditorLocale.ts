import { computed, inject, provide, shallowRef, watch, type InjectionKey, type Ref } from "vue";

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
  // 必须是响应式的：locale 包是异步加载的，先渲染的组件调用 t() 时 messages 还是 null，
  // 只有 shallowRef 才能在加载完成后触发这些组件重渲、把 key 换成真实文案。
  // （用普通对象会让 t() 永久停留在返回 key 的状态。）
  const messagesRef = shallowRef<TiptapLocale | null>(null);

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
