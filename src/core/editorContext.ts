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
import type { Editor as VueEditor } from "@tiptap/vue-3";

const YANIV_EDITOR_KEY: InjectionKey<Ref<Editor | null>> = Symbol("yanivEditor");

/** 在 EditorShell 根挂载 editor 实例后调用 */
export function provideYanivEditor(editor: Ref<VueEditor | null>): void {
  provide(YANIV_EDITOR_KEY, editor as Ref<Editor | null>);
}

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
