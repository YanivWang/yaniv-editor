import {
  inject,
  provide,
  computed,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
  toValue,
} from "vue";

import type { Editor } from "@tiptap/core";

const YANIV_EDITOR_KEY: InjectionKey<Ref<Editor | null>> = Symbol("yanivEditor");

/** 在 YanivEditor 根组件挂载 editor 实例后调用 */
export function provideYanivEditor(editor: Ref<Editor | null>): void {
  provide(YANIV_EDITOR_KEY, editor);
}

/**
 * 获取当前编辑器实例。
 * - YanivEditor 子树内：自动 inject
 * - 独立拼装工具栏（examples）：可传入 `editor` prop 作为 fallback
 */
export function useYanivEditor(
  fallback?: MaybeRefOrGetter<Editor | null | undefined>,
): ComputedRef<Editor | null> {
  const injected = inject(YANIV_EDITOR_KEY, null);

  return computed(() => {
    if (fallback !== undefined) {
      const fromProp = toValue(fallback);
      if (fromProp != null) return fromProp;
    }
    return injected?.value ?? null;
  });
}
