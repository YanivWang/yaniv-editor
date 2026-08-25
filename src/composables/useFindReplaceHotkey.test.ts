import { describe, expect, test } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";

import { useFindReplaceHotkey } from "./useFindReplaceHotkey";

/**
 * 回归护栏：Ctrl/Cmd+F 是**实例级**快捷键。
 *
 * 早期实现用 hotkeys-js 注册全局快捷键，同页多实例下会互相打架：
 * 按一次同时弹多个面板、一个实例卸载会 unbind 掉其他实例的 handler、
 * 全局 `hotkeys.filter` 覆盖还会影响宿主自己的快捷键。
 */
function mountHotkey(target: HTMLElement, onOpen: () => void, enabled = () => true) {
  const host = document.createElement("div");
  const app = createApp(
    defineComponent({
      setup() {
        useFindReplaceHotkey({ enabled, onOpen, target: ref(target) });
        return () => h("div");
      },
    }),
  );
  app.mount(host);
  return () => app.unmount();
}

function pressFind(el: HTMLElement, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "f",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  el.dispatchEvent(event);
  return event;
}

describe("useFindReplaceHotkey", () => {
  test("在目标容器内按下时触发，并阻止浏览器原生查找", () => {
    const root = document.createElement("div");
    document.body.append(root);
    let opened = 0;
    const unmount = mountHotkey(root, () => (opened += 1));

    const event = pressFind(root);

    expect(opened).toBe(1);
    expect(event.defaultPrevented).toBe(true);

    unmount();
    root.remove();
  });

  test("事件从容器内部冒泡上来同样生效", () => {
    const root = document.createElement("div");
    const inner = document.createElement("input");
    root.append(inner);
    document.body.append(root);
    let opened = 0;
    const unmount = mountHotkey(root, () => (opened += 1));

    pressFind(inner);

    expect(opened).toBe(1);
    unmount();
    root.remove();
  });

  test("多实例互不串扰：只有事件所在的编辑器响应", () => {
    const rootA = document.createElement("div");
    const rootB = document.createElement("div");
    document.body.append(rootA, rootB);

    let openedA = 0;
    let openedB = 0;
    const unmountA = mountHotkey(rootA, () => (openedA += 1));
    const unmountB = mountHotkey(rootB, () => (openedB += 1));

    pressFind(rootA);
    expect([openedA, openedB]).toEqual([1, 0]);

    pressFind(rootB);
    expect([openedA, openedB]).toEqual([1, 1]);

    unmountA();
    unmountB();
    rootA.remove();
    rootB.remove();
  });

  test("一个实例卸载后，另一个实例的快捷键仍然有效", () => {
    const rootA = document.createElement("div");
    const rootB = document.createElement("div");
    document.body.append(rootA, rootB);

    let openedB = 0;
    const unmountA = mountHotkey(rootA, () => {});
    const unmountB = mountHotkey(rootB, () => (openedB += 1));

    unmountA();
    pressFind(rootB);

    expect(openedB).toBe(1);
    unmountB();
    rootA.remove();
    rootB.remove();
  });

  test("焦点在编辑器之外时不拦截，Ctrl/Cmd+F 留给浏览器", () => {
    const root = document.createElement("div");
    const outside = document.createElement("div");
    document.body.append(root, outside);
    let opened = 0;
    const unmount = mountHotkey(root, () => (opened += 1));

    const event = pressFind(outside);

    expect(opened).toBe(0);
    expect(event.defaultPrevented).toBe(false);

    unmount();
    root.remove();
    outside.remove();
  });

  test("enabled() 为 false 时不拦截", () => {
    const root = document.createElement("div");
    document.body.append(root);
    let opened = 0;
    const unmount = mountHotkey(
      root,
      () => (opened += 1),
      () => false,
    );

    const event = pressFind(root);

    expect(opened).toBe(0);
    expect(event.defaultPrevented).toBe(false);

    unmount();
    root.remove();
  });

  test("带 Shift / Alt 的组合不误触（如 Ctrl+Shift+F）", () => {
    const root = document.createElement("div");
    document.body.append(root);
    let opened = 0;
    const unmount = mountHotkey(root, () => (opened += 1));

    pressFind(root, { shiftKey: true });
    pressFind(root, { altKey: true });

    expect(opened).toBe(0);
    unmount();
    root.remove();
  });

  test("卸载后不再响应", () => {
    const root = document.createElement("div");
    document.body.append(root);
    let opened = 0;
    const unmount = mountHotkey(root, () => (opened += 1));

    unmount();
    pressFind(root);

    expect(opened).toBe(0);
    root.remove();
  });
});
