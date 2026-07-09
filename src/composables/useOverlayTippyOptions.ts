import { computed } from "vue";

import { useYeZIndex } from "@/composables/useYeZIndex";
import { useOverlayPortal } from "@/core/editorContext";
import type { YeZIndexToken } from "@/utils/zIndex";

export interface OverlayTippyOptions {
  duration?: number;
  placement?: "top" | "bottom" | "left" | "right";
  offset?: [number, number];
}

/** Tippy 浮层：挂载到编辑器 overlay portal，z-index 与 CSS token 同步。 */
export function useOverlayTippyOptions(token: YeZIndexToken, options: OverlayTippyOptions = {}) {
  const overlayPortal = useOverlayPortal();
  const zIndex = useYeZIndex(token);

  return computed(() => {
    const portal = overlayPortal.value;
    if (!portal) {
      throw new Error("Overlay portal is not mounted");
    }

    return {
      duration: options.duration ?? 100,
      placement: options.placement ?? "top",
      offset: options.offset,
      zIndex: zIndex.value,
      appendTo: portal,
    };
  });
}
