// @vitest-environment jsdom

import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, ref, shallowRef } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { countEditorListenersFor, installBrowserStubs } from "@/testing/mountEditor";

import ZoomBar from "./ZoomBar.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(installBrowserStubs);

/** ZoomBar 订阅的两个事件 */
const WATCHED_EVENTS = ["update", "selectionUpdate"] as const;

/**
 * 底栏自己挂的监听数：只订 `update`。字数取自 `characterCount` storage，只随文档内容变，
 * 移动光标不改变计数——此前多订的 `selectionUpdate` 是纯粹的白算（不变量 37）。
 * 测试仍观察两个事件，漏订回退时数得出来。
 */
const OWN_LISTENERS = 1;

const editors: Editor[] = [];

function createEditor(): Editor {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const editor = new Editor({ element: host, extensions: [StarterKit] });
  editors.push(editor);
  return editor;
}

function mountZoomBar(editor: Editor): VueWrapper {
  return mount(
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
        return () => h(ZoomBar, { zoomLevel: 100, totalPages: 1, editor });
      },
    }),
    { attachTo: document.body },
  );
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

/**
 * 底栏会在编辑器还活着的时候卸载：`mode` 切到 preview 时
 * `resolveChromePolicy` 把 `showFooter` 置为 false，而 `computeSessionKey` 不含 mode，
 * 编辑器不重建。此前 ZoomBar 只在 watch 回调里处理 `oldEditor`，卸载路径上无人退订，
 * 于是 edit ↔ preview 每来回一次就在活着的编辑器上多留两个监听。
 */
describe("ZoomBar 的编辑器监听随组件生命周期释放", () => {
  it("卸载后监听数回到基线", () => {
    const editor = createEditor();
    const baseline = countEditorListenersFor(editor, WATCHED_EVENTS);

    const wrapper = mountZoomBar(editor);
    expect(countEditorListenersFor(editor, WATCHED_EVENTS)).toBe(baseline + OWN_LISTENERS);

    wrapper.unmount();
    expect(countEditorListenersFor(editor, WATCHED_EVENTS)).toBe(baseline);
  });

  it("反复挂载 / 卸载不累积监听", () => {
    const editor = createEditor();
    const baseline = countEditorListenersFor(editor, WATCHED_EVENTS);

    for (let i = 0; i < 3; i += 1) {
      mountZoomBar(editor).unmount();
    }

    expect(countEditorListenersFor(editor, WATCHED_EVENTS)).toBe(baseline);
  });

  it("换编辑器实例时旧实例被摘干净", () => {
    const first = createEditor();
    const second = createEditor();
    const firstBaseline = countEditorListenersFor(first, WATCHED_EVENTS);

    const current = shallowRef<Editor>(first);
    const wrapper = mount(
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
          return () => h(ZoomBar, { zoomLevel: 100, totalPages: 1, editor: current.value });
        },
      }),
      { attachTo: document.body },
    );

    expect(countEditorListenersFor(first, WATCHED_EVENTS)).toBe(firstBaseline + OWN_LISTENERS);

    current.value = second;
    return wrapper.vm.$nextTick().then(() => {
      expect(countEditorListenersFor(first, WATCHED_EVENTS)).toBe(firstBaseline);
      expect(countEditorListenersFor(second, WATCHED_EVENTS)).toBe(firstBaseline + OWN_LISTENERS);
      wrapper.unmount();
      expect(countEditorListenersFor(second, WATCHED_EVENTS)).toBe(firstBaseline);
    });
  });
});
