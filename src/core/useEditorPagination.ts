import { nextTick, ref } from "vue";

import { A4_HEIGHT_PX } from "@/extensions/pageConstants";

import type { Ref } from "vue";

/**
 * 文档型布局的页码统计。
 *
 * **只负责算「共几页」，不碰页面尺寸。** 页宽 / 内边距 / 最小高度全部是
 * `--ye-doc-*` token，由 `variables.css` 给基础值、三套 appearance 各自覆盖，
 * 这里再写一遍就会盖掉外观（内联 style 优先级高于任何选择器）。
 */
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

  return {
    totalPages,
    zoomLevel,
    calculatePages,
  };
}
