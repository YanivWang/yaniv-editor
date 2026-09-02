import { nextTick, ref } from "vue";

import { A4_HEIGHT_PX } from "@/extensions/pageConstants";

import type { Ref } from "vue";

/**
 * 文档型布局的页码统计。
 *
 * **只负责算「共几页」，不碰页面尺寸。** 页宽 / 内边距 / 最小高度全部是
 * `--ye-doc-*` token，由 `variables.css` 给基础值、三套 appearance 各自覆盖，
 * 这里再写一遍就会盖掉外观（内联 style 优先级高于任何选择器）。
 *
 * **为什么固定用 A4 高度，而不是当前外观的 `--ye-doc-page-min-height`？**
 * 因为那个 token 不是页高：它是 `min-height`（default 480px 只表示「至少这么高」，
 * notion 是 `calc(100vh - 100px)` 跟着视口走），而三套外观都是**连续滚动**布局
 * ——`.continuous-pages` 是一整个容器，全仓没有任何画分页线的规则。
 * 也就是说界面上根本不存在「第 2 页」这个视觉对象，`totalPages` 只出现在状态栏的
 * 「共 N 页」里，是一个**按 A4 打印大约多少页**的估算指标，与 Word 导出（A4）同口径。
 * 换成外观的 min-height 反而会得出一个既不对应视觉、也不对应打印的数字。
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
