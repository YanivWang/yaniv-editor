import { onBeforeUnmount, watch, type Ref } from "vue";

/**
 * WAI-ARIA APG 的 toolbar 键盘模式：**整个工具栏是单一 tab stop**，
 * 内部用方向键移动焦点。
 *
 * 不做这件事的后果是真实的：full preset 下工具栏有 18 个可聚焦控件，
 * 键盘用户要按 18 次 Tab 才能穿过工具栏到达正文。
 *
 * 实现要点：
 * - 只有「当前项」`tabindex="0"`，其余 `tabindex="-1"`；焦点进入后由方向键接管。
 * - 用 `MutationObserver` 重扫：门控工具按钮是 `defineAsyncComponent` 按需挂载的，
 *   首帧拿不到完整列表。
 * - 输入型控件（input / textarea / contenteditable / combobox）内的方向键不劫持，
 *   否则会破坏字号输入、颜色十六进制输入等的光标移动。
 * - Ant Design 的下拉浮层挂在 overlay portal（工具栏之外），其方向键不会冒泡到这里。
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 */

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const TEXT_ENTRY_SELECTOR = "input, textarea, [contenteditable='true'], [role='combobox']";

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(TEXT_ENTRY_SELECTOR);
}

export function useRovingTabindex(containerRef: Ref<HTMLElement | null>): void {
  let activeIndex = 0;

  /**
   * 可见性判定不依赖布局盒（`offsetParent` / `getClientRects`）：
   * 那两者在无布局引擎的环境（jsdom、SSR 水合前）恒为空，会把整个列表过滤没。
   * 优先用 `checkVisibility()`，不可用时退回属性判断。
   */
  const isVisible = (el: HTMLElement): boolean => {
    if (el.hasAttribute("hidden") || el.closest("[hidden]")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    const withCheck = el as HTMLElement & { checkVisibility?: () => boolean };
    return typeof withCheck.checkVisibility === "function" ? withCheck.checkVisibility() : true;
  };

  const items = (): HTMLElement[] => {
    const root = containerRef.value;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
  };

  /** 只有当前项参与 Tab 序列 */
  const sync = (): void => {
    const list = items();
    if (!list.length) return;
    if (activeIndex >= list.length) activeIndex = list.length - 1;

    list.forEach((el, index) => {
      el.tabIndex = index === activeIndex ? 0 : -1;
    });
  };

  const move = (delta: number): void => {
    const list = items();
    if (!list.length) return;
    activeIndex = (activeIndex + delta + list.length) % list.length;
    sync();
    list[activeIndex]?.focus();
  };

  const moveTo = (index: number): void => {
    const list = items();
    if (!list.length) return;
    activeIndex = Math.max(0, Math.min(index, list.length - 1));
    sync();
    list[activeIndex]?.focus();
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTextEntry(event.target)) return;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(items().length - 1);
        break;
      default:
        break;
    }
  };

  /** 鼠标点击或 Tab 进入后，把锚点同步到实际获得焦点的控件 */
  const onFocusin = (event: FocusEvent): void => {
    const list = items();
    const index = list.indexOf(event.target as HTMLElement);
    if (index >= 0 && index !== activeIndex) {
      activeIndex = index;
      sync();
    }
  };

  let observer: MutationObserver | null = null;

  const teardown = (el: HTMLElement | null): void => {
    observer?.disconnect();
    observer = null;
    el?.removeEventListener("keydown", onKeydown);
    el?.removeEventListener("focusin", onFocusin);
  };

  watch(
    containerRef,
    (el, prev) => {
      teardown(prev ?? null);
      if (!el) return;

      el.addEventListener("keydown", onKeydown);
      el.addEventListener("focusin", onFocusin);

      // 异步组件挂载后列表会变，需要重新分配 tabindex
      observer = new MutationObserver(() => sync());
      observer.observe(el, { childList: true, subtree: true });

      sync();
    },
    { immediate: true, flush: "post" },
  );

  onBeforeUnmount(() => teardown(containerRef.value));
}
