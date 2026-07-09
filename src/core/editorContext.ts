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

import { OVERLAY_PORTAL_CLASS, resolveOverlayPortal } from "@/core/overlayPortal";

import type { Editor } from "@tiptap/core";
import type { Editor as VueEditor } from "@tiptap/vue-3";

export { OVERLAY_PORTAL_CLASS, resolveOverlayPortal };

const YANIV_EDITOR_KEY: InjectionKey<Ref<Editor | null>> = Symbol("yanivEditor");
const EDITOR_ROOT_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol("yanivEditorRoot");
const OVERLAY_PORTAL_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol(
  "yanivEditorOverlayPortal",
);

/** 在 EditorShell 根挂载 editor 实例后调用 */
export function provideYanivEditor(editor: Ref<VueEditor | null>): void {
  provide(YANIV_EDITOR_KEY, editor as Ref<Editor | null>);
}

/** 在 EditorShell 根节点挂载后调用 */
export function provideEditorRoot(root: Ref<HTMLElement | null>): void {
  provide(EDITOR_ROOT_KEY, root);
}

/** 在 EditorShell overlay portal 挂载后调用 */
export function provideOverlayPortal(portal: Ref<HTMLElement | null>): void {
  provide(OVERLAY_PORTAL_KEY, portal);
}

export function useEditorRoot(): Ref<HTMLElement | null> {
  const root = inject(EDITOR_ROOT_KEY, null);
  if (!root) {
    throw new Error("useEditorRoot() must be used within EditorShell");
  }
  return root;
}

export function useOverlayPortal(): Ref<HTMLElement | null> {
  const portal = inject(OVERLAY_PORTAL_KEY, null);
  if (!portal) {
    throw new Error("useOverlayPortal() must be used within EditorShell");
  }
  return portal;
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
