import { computed, inject, provide, shallowRef, watch, type InjectionKey, type Ref } from "vue";

import { loadLocale, normalizeLocaleCode, type LocaleCode } from "@/locales/manager";
import { interpolate, resolveMessage } from "@/locales/resolveMessage";
import type { TiptapLocale } from "@/locales/types";

export interface EditorLocaleContext {
  locale: Ref<LocaleCode>;
  messages: Ref<TiptapLocale | null>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const editorLocaleKey: InjectionKey<EditorLocaleContext> = Symbol("editorLocale");

export function provideEditorLocale(localeSource: Ref<string | undefined>): EditorLocaleContext {
  const locale = computed(() => normalizeLocaleCode(localeSource.value));
  // 必须是响应式的：locale 包是异步加载的，先渲染的组件调用 t() 时 messages 还是 null，
  // 只有 shallowRef 才能在加载完成后触发这些组件重渲、把 key 换成真实文案。
  // （用普通对象会让 t() 永久停留在返回 key 的状态。）
  const messagesRef = shallowRef<TiptapLocale | null>(null);

  watch(
    locale,
    async (code, _prev, onCleanup) => {
      // 语言包是异步加载的，两次切换的 import 可能「后发先至」：先切 zh→en，
      // 若 zh 的 chunk 晚于 en 落地，没有守卫时 zh 会把 en 覆盖掉，
      // 于是 locale 报 en-US、界面却是中文，且直到下次切换都不会自愈。
      let stale = false;
      onCleanup(() => {
        stale = true;
      });

      // 只加载当前 locale：本实例的 t() 不做跨语言兜底（未命中直接返回 key），
      // 额外预载 en-US 的那份 chunk 没有任何读取方。内置两包的 key 集合由
      // localeParity.test.ts 保证一致，兜底包也不可能补上缺失的 key。
      const messages = await loadLocale(code);
      if (stale) return;
      messagesRef.value = messages;
    },
    { immediate: true },
  );

  const ctx: EditorLocaleContext = {
    locale: computed(() => locale.value),
    messages: computed(() => messagesRef.value),
    t(key: string, params?: Record<string, string | number>) {
      const message = resolveMessage(messagesRef.value, key);
      if (message === undefined) return key;
      return interpolate(message, params);
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
