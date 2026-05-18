import { nextTick, ref } from "vue";

import {
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  PAGE_PADDING_TOP_PX,
  PAGE_PADDING_BOTTOM_PX,
  PAGE_CONTENT_HEIGHT_PX,
} from "@/extensions/pageConstants";

import type { Ref } from "vue";

export function useEditorPagination(containerRef: Ref<HTMLElement | null>) {
  const totalPages = ref(1);
  const zoomLevel = ref(100);

  const calculatePages = () => {
    nextTick(() => {
      const proseMirrorEl = containerRef.value?.querySelector(".ProseMirror");
      if (!proseMirrorEl) return;

      const style = getComputedStyle(proseMirrorEl);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const contentHeight = proseMirrorEl.scrollHeight - (paddingTop + paddingBottom);
      const pageContentHeight = A4_HEIGHT_PX - (paddingTop + paddingBottom);
      const pages = Math.ceil(contentHeight / pageContentHeight);
      totalPages.value = Math.max(pages, 1);
    });
  };

  const initPageCssVariables = () => {
    if (!containerRef.value) return;
    containerRef.value.style.setProperty("--a4-width-px", `${A4_WIDTH_PX}px`);
    containerRef.value.style.setProperty("--padding-top-px", `${PAGE_PADDING_TOP_PX}px`);
    containerRef.value.style.setProperty("--padding-bottom-px", `${PAGE_PADDING_BOTTOM_PX}px`);
    containerRef.value.style.setProperty("--page-content-height-px", `${PAGE_CONTENT_HEIGHT_PX}px`);
  };

  return {
    totalPages,
    zoomLevel,
    calculatePages,
    initPageCssVariables,
  };
}
