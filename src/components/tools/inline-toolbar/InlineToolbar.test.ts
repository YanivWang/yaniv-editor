/**
 * `role="toolbar"` 按 WAI-ARIA APG 必须是单一 tab stop，内部用方向键移动焦点。
 * 顶栏 `ToolbarNav` 一直接着 `useRovingTabindex`，inline 工具栏漏了。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import type { InlineToolbarConfig } from "@/configs/inlineTypes";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";

import InlineToolbar from "./InlineToolbar.vue";

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

/** 用真实按钮替掉异步子组件，好观察 tabindex 分布 */
const ButtonStub = defineComponent({
  setup: () => () => h("button", { type: "button" }, "x"),
});

async function mountToolbar(config: InlineToolbarConfig) {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({ element: el, extensions: [StarterKit], content: "<p>x</p>" });
  const e = editor;

  const Host = defineComponent({
    setup() {
      provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () => h(InlineToolbar, { editor: e, config });
    },
  });

  const wrapper = mount(Host, {
    attachTo: document.body,
    global: {
      stubs: {
        UndoRedoButton: ButtonStub,
        TextFormatButtons: ButtonStub,
        LinkButton: ButtonStub,
      },
    },
  });
  await nextTick();
  await nextTick();
  return wrapper;
}

describe("InlineToolbar 的键盘可达性", () => {
  it("容器带 role=toolbar 与 aria-label", async () => {
    const wrapper = await mountToolbar({ undoRedo: true, textFormat: true, link: true });
    const bar = wrapper.find('[role="toolbar"]');
    expect(bar.exists()).toBe(true);
    expect(bar.attributes("aria-label")).toBeTruthy();
  });

  it("整个工具栏只有一个 tab stop", async () => {
    const wrapper = await mountToolbar({ undoRedo: true, textFormat: true, link: true });
    const buttons = wrapper.element.querySelectorAll("button");
    expect(buttons.length, "桩按钮应已挂载").toBeGreaterThan(1);

    const tabbable = [...buttons].filter((b) => b.getAttribute("tabindex") !== "-1");
    expect(tabbable, "只有当前项可 Tab 到达").toHaveLength(1);
    expect(tabbable[0].getAttribute("tabindex")).toBe("0");
  });
});
