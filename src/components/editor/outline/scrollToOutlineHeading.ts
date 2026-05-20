const OUTLINE_SCROLL_OFFSET_VAR = "--ye-outline-scroll-offset";

/** CSS 变量未定义时的兜底（与 variables.css 默认值一致） */
const DEFAULT_OUTLINE_SCROLL_OFFSET = 80;

export interface ScrollToOutlineHeadingOptions {
  offset?: number;
  behavior?: ScrollBehavior;
}

/** 从 CSS 变量 `--ye-outline-scroll-offset` 读取大纲滚动留白（px） */
export function getOutlineScrollOffset(element?: HTMLElement | null): number {
  const target = element ?? document.documentElement;
  const raw = getComputedStyle(target).getPropertyValue(OUTLINE_SCROLL_OFFSET_VAR).trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_OUTLINE_SCROLL_OFFSET;
}

/**
 * 在指定滚动容器内将标题滚到视口主区域（距顶部约 offset px）
 */
export function scrollToOutlineHeading(
  scrollParent: HTMLElement | null | undefined,
  headingEl: HTMLElement | null | undefined,
  options?: ScrollToOutlineHeadingOptions,
): boolean {
  if (!scrollParent || !headingEl) return false;

  const offset = options?.offset ?? getOutlineScrollOffset(scrollParent);
  const containerRect = scrollParent.getBoundingClientRect();
  const headingRect = headingEl.getBoundingClientRect();
  const delta = headingRect.top - containerRect.top - offset;

  scrollParent.scrollTo({
    top: scrollParent.scrollTop + delta,
    behavior: options?.behavior ?? "smooth",
  });

  return true;
}
