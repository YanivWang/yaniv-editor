import { computed, type ComputedRef } from "vue";

import { useEditorRoot, useOverlayPortal } from "@/core/editorContext";
import { resolveOverlayPortal } from "@/core/overlayPortal";

/**
 * Ant Design / BubbleMenu 等浮层挂载目标：始终指向 EditorShell overlay portal。
 * 禁止回退到 document.body。
 */
export function useOverlayMountTarget(): ComputedRef<() => HTMLElement> {
  const overlayPortal = useOverlayPortal();
  const editorRoot = useEditorRoot();

  return computed(() => () => {
    if (overlayPortal.value) return overlayPortal.value;
    const root = editorRoot.value;
    if (root) return resolveOverlayPortal(root);
    throw new Error("Overlay portal is not mounted");
  });
}

export type OverlayBubblePlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "left-start"
  | "left-end"
  | "right-start"
  | "right-end";

export interface OverlayBubbleMenuOptions {
  placement?: OverlayBubblePlacement;
  /** Floating UI offset：number → mainAxis；或 { mainAxis, crossAxis } */
  offset?: number | { mainAxis?: number; crossAxis?: number };
}

export interface OverlayBubbleMenuBindings {
  /** 传给 `<bubble-menu :options>`（Floating UI） */
  options: {
    strategy: "fixed";
    placement: OverlayBubblePlacement;
    offset: number | { mainAxis?: number; crossAxis?: number };
  };
  /**
   * 传给 `<bubble-menu :append-to>`。
   * 必须是 HTMLElement：@tiptap/vue-3 运行时 prop 仅声明 Object，
   * 传 () => HTMLElement 会触发 Vue type check 警告。
   */
  appendTo: HTMLElement;
}

/**
 * Tiptap 3 BubbleMenu（Floating UI）绑定：
 * - appendTo → overlay portal（HTMLElement，非 getter）
 * - options → placement / offset / strategy
 * z-index 由 CSS token（.floating-menu 等）继承。
 */
export function useOverlayBubbleMenu(
  menuOptions: OverlayBubbleMenuOptions = {},
): ComputedRef<OverlayBubbleMenuBindings> {
  const getMountTarget = useOverlayMountTarget();

  return computed(() => ({
    options: {
      strategy: "fixed" as const,
      placement: menuOptions.placement ?? "top",
      offset: menuOptions.offset ?? 8,
    },
    appendTo: getMountTarget.value(),
  }));
}
