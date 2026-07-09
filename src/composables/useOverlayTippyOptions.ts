import { computed, type ComputedRef } from "vue";

import { useEditorRoot, useOverlayPortal } from "@/core/editorContext";
import { resolveOverlayPortal } from "@/core/overlayPortal";
import type { YeZIndexToken } from "@/utils/zIndex";

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
  /**
   * Floating UI offset：
   * - number → mainAxis
   * - [skidding, distance]（兼容旧 tippy 写法）→ crossAxis / mainAxis
   */
  offset?: number | [number, number];
}

export interface OverlayBubbleMenuBindings {
  /** 传给 `<bubble-menu :options>`（Floating UI） */
  options: {
    strategy: "fixed";
    placement: OverlayBubblePlacement;
    offset: number | { mainAxis?: number; crossAxis?: number };
  };
  /** 传给 `<bubble-menu :append-to>` */
  appendTo: () => HTMLElement;
}

function resolveOffset(
  offset: OverlayBubbleMenuOptions["offset"],
): number | { mainAxis?: number; crossAxis?: number } {
  if (offset == null) return 8;
  if (typeof offset === "number") return offset;
  const [skidding, distance] = offset;
  return { mainAxis: distance, crossAxis: skidding };
}

/**
 * Tiptap 3 BubbleMenu（Floating UI）绑定：
 * - appendTo → overlay portal
 * - options → placement / offset / strategy
 * z-index 由 CSS token（.floating-menu 等）继承，无需 tippy zIndex。
 */
export function useOverlayBubbleMenu(
  _token: YeZIndexToken,
  menuOptions: OverlayBubbleMenuOptions = {},
): ComputedRef<OverlayBubbleMenuBindings> {
  const overlayPortal = useOverlayPortal();
  const editorRoot = useEditorRoot();

  return computed(() => ({
    options: {
      strategy: "fixed" as const,
      placement: menuOptions.placement ?? "top",
      offset: resolveOffset(menuOptions.offset),
    },
    appendTo: () => {
      if (overlayPortal.value) return overlayPortal.value;
      const root = editorRoot.value;
      if (root) return resolveOverlayPortal(root);
      throw new Error("Overlay portal is not mounted");
    },
  }));
}

/** @deprecated 使用 useOverlayBubbleMenu */
export const useOverlayTippyOptions = useOverlayBubbleMenu;
