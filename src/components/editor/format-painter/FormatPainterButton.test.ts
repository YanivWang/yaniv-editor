// @vitest-environment jsdom

import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, shallowRef } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { FormatPainter } from "@/extensions/formatPainter";
import { countEditorListenersFor, installBrowserStubs } from "@/testing/mountEditor";

import FormatPainterButton from "./FormatPainterButton.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(installBrowserStubs);

const editors: Editor[] = [];
let wrapper: VueWrapper | null = null;

function createEditor(): Editor {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const editor = new Editor({ element: host, extensions: [StarterKit, FormatPainter] });
  editors.push(editor);
  return editor;
}

const WATCHED_EVENTS = ["update", "selectionUpdate", "transaction"] as const;

/**
 * 组件自己挂的监听数：只订 `transaction`（不变量 37，它是另两者的超集）。
 * 测试仍观察全部三个事件，这样万一回退成多重订阅，这里立刻数得出来。
 */
const OWN_LISTENERS = 1;

const totalListeners = (editor: Editor) => countEditorListenersFor(editor, WATCHED_EVENTS);

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

/**
 * 换编辑器实例时必须退订**上一个**实例。
 *
 * 此前 watch 回调里读的是 `editor.value`——触发时它已是新实例，`off()` 全打在
 * 新实例上，旧实例的三个监听一个也摘不掉。
 */
describe("FormatPainterButton 的编辑器事件订阅", () => {
  it("切换编辑器实例后，旧实例上的监听被摘干净", async () => {
    const first = createEditor();
    const second = createEditor();

    const firstBaseline = totalListeners(first);
    const secondBaseline = totalListeners(second);

    const current = shallowRef<Editor | null>(first);
    wrapper = mount(
      defineComponent({
        setup() {
          const root = document.createElement("div");
          root.className = EDITOR_ROOT_CLASS;
          const portal = document.createElement("div");
          portal.className = OVERLAY_PORTAL_CLASS;
          root.append(portal);
          document.body.append(root);

          provideEditorRoot(ref(root));
          provideOverlayPortal(ref(portal));
          provideEditorLocale(ref("zh-CN"));
          return () => h(FormatPainterButton, { editor: current.value });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();

    expect(totalListeners(first)).toBe(firstBaseline + OWN_LISTENERS);

    current.value = second;
    await nextTick();

    expect(totalListeners(first)).toBe(firstBaseline);
    expect(totalListeners(second)).toBe(secondBaseline + OWN_LISTENERS);
  });

  it("卸载后不留监听", async () => {
    const editor = createEditor();
    const baseline = totalListeners(editor);

    const current = shallowRef<Editor | null>(editor);
    wrapper = mount(
      defineComponent({
        setup() {
          const root = document.createElement("div");
          root.className = EDITOR_ROOT_CLASS;
          const portal = document.createElement("div");
          portal.className = OVERLAY_PORTAL_CLASS;
          root.append(portal);
          document.body.append(root);

          provideEditorRoot(ref(root));
          provideOverlayPortal(ref(portal));
          provideEditorLocale(ref("zh-CN"));
          return () => h(FormatPainterButton, { editor: current.value });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(totalListeners(editor)).toBe(baseline + OWN_LISTENERS);

    wrapper.unmount();
    wrapper = null;
    expect(totalListeners(editor)).toBe(baseline);
  });
});

/**
 * 双击格式刷曾连弹 3 个 toast。
 *
 * DOM 规范里 `dblclick` 之前必然先发两次 `click`，于是一次双击走完
 * 采样→激活（toast A）→取消（toast B）→连续模式（toast C）。最终状态是对的，只是噪音。
 *
 * 标准修法是把单击延后一个双击窗口（约 200ms），代价是**每次**普通单击都变钝。
 * 这里改用 `MouseEvent.detail`——规范保证双击序列里第一次 click 是 1、第二次是 2——
 * 跳过第二次 click，单击零延迟。`dblclick` 的判定则看 `modeBeforeClick`
 * （双击**开始前**的模式），因为它跑到时 storage 已被第一次 click 改过一轮了。
 */
describe("格式刷双击不再连弹 toast", () => {
  function mountButton(editor: Editor): { wrapper: VueWrapper; portal: HTMLElement } {
    const root = document.createElement("div");
    root.className = EDITOR_ROOT_CLASS;
    const portal = document.createElement("div");
    portal.className = OVERLAY_PORTAL_CLASS;
    root.append(portal);
    document.body.append(root);

    const w = mount(
      defineComponent({
        setup() {
          provideEditorRoot(ref(root));
          provideOverlayPortal(ref(portal));
          provideEditorLocale(ref("zh-CN"));
          return () => h(FormatPainterButton, { editor });
        },
      }),
      { attachTo: document.body },
    );
    return { wrapper: w, portal };
  }

  const toastCount = (portal: HTMLElement) => portal.querySelectorAll(".ye-overlay-toast").length;

  function press(button: HTMLElement, type: "click" | "dblclick", detail: number) {
    button.dispatchEvent(new MouseEvent(type, { detail, bubbles: true, cancelable: true }));
  }

  /** 真实双击的事件序列：click(1) → click(2) → dblclick(2) */
  async function doubleClick(button: HTMLElement) {
    press(button, "click", 1);
    press(button, "click", 2);
    press(button, "dblclick", 2);
    await nextTick();
  }

  function selectSomeText(editor: Editor) {
    editor.commands.setContent("<p><strong>加粗文本</strong>其余</p>");
    editor.commands.setTextSelection({ from: 1, to: 5 });
  }

  it("单击一次只弹一个 toast，进入单次模式", async () => {
    const editor = createEditor();
    selectSomeText(editor);
    const { wrapper: w, portal } = mountButton(editor);
    wrapper = w;

    press(w.find("button").element, "click", 1);
    await nextTick();

    expect(toastCount(portal)).toBe(1);
    const storage = editor.storage.formatPainter as { isActive: boolean; isContinuous: boolean };
    expect(storage.isActive).toBe(true);
    expect(storage.isContinuous).toBe(false);
  });

  it("双击最多弹 2 个 toast（此前是 3 个），最终进入连续模式", async () => {
    const editor = createEditor();
    selectSomeText(editor);
    const { wrapper: w, portal } = mountButton(editor);
    wrapper = w;

    await doubleClick(w.find("button").element);

    expect(toastCount(portal)).toBeLessThanOrEqual(2);
    const storage = editor.storage.formatPainter as { isActive: boolean; isContinuous: boolean };
    expect(storage.isActive).toBe(true);
    expect(storage.isContinuous).toBe(true);
  });

  it("单次模式下双击升级为连续模式", async () => {
    const editor = createEditor();
    selectSomeText(editor);
    const { wrapper: w } = mountButton(editor);
    wrapper = w;
    const button = w.find("button").element as HTMLElement;

    press(button, "click", 1);
    await nextTick();
    await doubleClick(button);

    const storage = editor.storage.formatPainter as { isActive: boolean; isContinuous: boolean };
    expect(storage.isActive).toBe(true);
    expect(storage.isContinuous).toBe(true);
  });

  it("连续模式下双击退出，不会又转回连续模式", async () => {
    const editor = createEditor();
    selectSomeText(editor);
    const { wrapper: w } = mountButton(editor);
    wrapper = w;
    const button = w.find("button").element as HTMLElement;

    await doubleClick(button);
    const afterFirst = editor.storage.formatPainter as { isContinuous: boolean };
    expect(afterFirst.isContinuous).toBe(true);

    await doubleClick(button);

    const storage = editor.storage.formatPainter as { isActive: boolean; isContinuous: boolean };
    expect(storage.isActive).toBe(false);
    expect(storage.isContinuous).toBe(false);
  });

  it("单击退出仍然可用（不受双击判定影响）", async () => {
    const editor = createEditor();
    selectSomeText(editor);
    const { wrapper: w } = mountButton(editor);
    wrapper = w;
    const button = w.find("button").element as HTMLElement;

    press(button, "click", 1);
    await nextTick();
    expect((editor.storage.formatPainter as { isActive: boolean }).isActive).toBe(true);

    press(button, "click", 1);
    await nextTick();
    expect((editor.storage.formatPainter as { isActive: boolean }).isActive).toBe(false);
  });
});
