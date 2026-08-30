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

const READY_TIMEOUT_MS = 10_000;

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

export function unmountAll(): void {
  while (mounted.length) mounted.pop()?.unmount();
  document.body.innerHTML = "";
}

/** 可访问名称：可见文本 / aria-label / title 任一存在即可被辅助技术朗读 */
export function accessibleName(el: Element): string {
  return el.getAttribute("aria-label") ?? el.getAttribute("title") ?? (el.textContent ?? "").trim();
}
