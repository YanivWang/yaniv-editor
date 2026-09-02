/**
 * 组件测试公用挂载工具（仅测试引用，不进入构建产物）。
 *
 * 编辑器的就绪是异步的：locale 与所有门控能力都走 `await import()`，
 * 覆盖率插桩下还会明显变慢。因此这里按**时间预算**轮询到 ProseMirror 真正挂载，
 * 而不是固定 tick 次数——后者在 CI 上会随机超时。
 */
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";

import type { VueWrapper } from "@vue/test-utils";
import type { Component } from "vue";

/**
 * 就绪预算要**贴着** `vitest.config.ts` 的 `testTimeout`（20s）留一点余量，而不是取它的一半。
 *
 * 轮询一旦就绪就立刻返回，因此健康机器上这个值多大都不影响耗时；它只在机器被别的负载
 * 挤占时起作用。此前是 10s——比 testTimeout 少一半，于是繁忙机器上编辑器还在解析
 * 十几个门控 chunk 时轮询就先放弃了，明明还剩 10s 预算没用。
 *
 * 放宽不会掩盖任何回归：真的挂死仍然会失败，只是从 10s 变成 18s，且报错里照样带当前 DOM。
 */
const READY_TIMEOUT_MS = 18_000;

/**
 * jsdom 没有布局引擎，`view.coordsAtPos()` 会在 `getClientRects` 上抛错，
 * 导致任何需要定位浮层的代码路径（斜杠菜单、AI 悬浮层）在单测里跑不起来。
 *
 * 这里补的是**让被测代码能执行**的最小几何桩：测试不对坐标做任何断言，
 * 定位本身属于浏览器行为，由 Playwright E2E 覆盖。
 */
export function installLayoutStubs(): void {
  const rects = () => {
    const rect = new DOMRect(0, 0, 10, 10);
    return {
      length: 1,
      item: () => rect,
      0: rect,
      [Symbol.iterator]: function* () {
        yield rect;
      },
    } as unknown as DOMRectList;
  };

  /**
   * `scrollIntoView` 在 jsdom 里**根本不存在**（不是空实现），调用会抛 TypeError。
   * 它是纯滚动行为，属于上面说的「让被测代码能执行」的那一类：菜单键盘导航
   * （`BlockPickerMenu` 的 `scrollToSelected`）把它写在 `nextTick` 回调里，
   * 抛出后会变成未处理的 Promise 拒绝，让整轮 verify 退出 1 而不是某条用例转红。
   */
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  for (const proto of [Text.prototype, Element.prototype, Range.prototype]) {
    Object.defineProperty(proto, "getClientRects", {
      configurable: true,
      writable: true,
      value: rects,
    });
    Object.defineProperty(proto, "getBoundingClientRect", {
      configurable: true,
      writable: true,
      value: () => new DOMRect(0, 0, 10, 10),
    });
  }
}

/** Tiptap / ant-design-vue 在 jsdom 下缺失的浏览器 API */
export function installBrowserStubs(): void {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}

const mounted: VueWrapper[] = [];

export async function mountEditor(
  component: Component,
  props: Record<string, unknown> = {},
): Promise<VueWrapper> {
  const wrapper = mount(component, { props, attachTo: document.body });
  mounted.push(wrapper);

  /**
   * 必须等到「稳定就绪」而不是「首次出现 ProseMirror」。
   *
   * locale 是异步加载的，加载完成会改变 sessionKey 并触发 session 重建：
   * 此刻 `editor` 被置为 null、ProseMirror 从 DOM 消失、随后新实例挂载。
   * 若在这个空窗前返回，测试可能拿到即将被销毁的实例，或者读到 `editor === null`。
   * 这里要求连续若干次检查都就绪，才认为重建已尘埃落定。
   */
  const REQUIRED_STABLE_TICKS = 3;
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let stable = 0;

  while (Date.now() < deadline) {
    await flushPromises();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const editor = (wrapper.vm as unknown as { getEditor?: () => unknown }).getEditor?.();
    stable = wrapper.find(".ProseMirror").exists() && editor ? stable + 1 : 0;

    if (stable >= REQUIRED_STABLE_TICKS) return wrapper;
  }

  throw new Error(
    `编辑器在 ${READY_TIMEOUT_MS}ms 内未稳定就绪；当前 DOM:\n${wrapper.html().slice(0, 600)}`,
  );
}

/**
 * 等实例 locale 的语言包落地。
 *
 * 语言包是 `await import()` 的，一次 `flushPromises()` 等不到；没等够时组件里的
 * `t()` 返回的还是原始 key（`editor.mathEdit`），断言会莫名其妙地失败。
 *
 * ⚠️ 判据只能问 locale 上下文自己。按渲染文本判（「页面上还有没有 `editor.` 开头的字」）
 * 依赖被测组件恰好渲染了某条文案——组件如果渲染的是公式、图标或空弹窗，
 * 判据一开始就满足，等于**一次都没等**。这个坑在三个测试文件里各踩了一次。
 */
export async function waitForLocaleMessages(
  ctx: { messages: { value: unknown } },
  attempts = 80,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await flushPromises();
    await nextTick();
    if (ctx.messages.value !== null) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("语言包未在预期内就绪");
}

export function unmountAll(): void {
  while (mounted.length) mounted.pop()?.unmount();
  document.body.innerHTML = "";
}

/**
 * 统计编辑器上某个事件挂了几个监听。
 *
 * Tiptap 的 `EventEmitter` 把监听存在 `callbacks[event]` 数组里。测「换实例后旧实例
 * 是否被摘干净」只能看这份账本——监听留在旧实例上不改变任何可见状态，正是它难被发现的原因。
 */
export function countEditorListeners(editor: object, event: string): number {
  const callbacks = (editor as { callbacks?: Record<string, unknown[]> }).callbacks ?? {};
  return (callbacks[event] ?? []).length;
}

/** 一组事件的监听总数，便于与基线做整体比较 */
export function countEditorListenersFor(editor: object, events: readonly string[]): number {
  return events.reduce((sum, event) => sum + countEditorListeners(editor, event), 0);
}

/** 可访问名称：可见文本 / aria-label / title 任一存在即可被辅助技术朗读 */
export function accessibleName(el: Element): string {
  return el.getAttribute("aria-label") ?? el.getAttribute("title") ?? (el.textContent ?? "").trim();
}
