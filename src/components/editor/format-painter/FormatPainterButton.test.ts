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

    expect(totalListeners(first)).toBe(firstBaseline + WATCHED_EVENTS.length);

    current.value = second;
    await nextTick();

    expect(totalListeners(first)).toBe(firstBaseline);
    expect(totalListeners(second)).toBe(secondBaseline + WATCHED_EVENTS.length);
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
    expect(totalListeners(editor)).toBe(baseline + WATCHED_EVENTS.length);

    wrapper.unmount();
    wrapper = null;
    expect(totalListeners(editor)).toBe(baseline);
  });
});
