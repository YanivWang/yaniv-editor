/**
 * 字号 / 字体下拉必须跟随选区更新。
 *
 * `editor.state` **不是** Vue 响应式的：
 * `watch(() => editor.value?.getAttributes("textStyle")?.fontSize)` 只在 editor
 * **实例**换掉时才重新求值，光标在不同字号的文字之间移动一概读不到
 * （实测 watch 只收到 immediate 那一次，连 `state.selection.from` 都不触发）。
 * 正确做法是显式订阅 `selectionUpdate` / `transaction`——本仓库其余 8 个组件都这么做。
 */
import { FontFamily, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { FontSize } from "@/extensions/fontSize";

import FontFamilySelect from "./FontFamilySelect.vue";
import FontSizeSelect from "./FontSizeSelect.vue";

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

const captured = ref<{ label?: string; items: MenuItemConfig[] }>({ items: [] });
const DropdownStub = defineComponent({
  props: { items: { type: Array, default: () => [] }, label: { type: String, default: "" } },
  setup(props) {
    // 必须在 render 里取，setup 只跑一次——那样拿到的永远是首帧的 items
    return () => {
      captured.value = { label: props.label, items: props.items as MenuItemConfig[] };
      return h("div");
    };
  },
});

function mountSelect(component: unknown, content: string) {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({
    element: el,
    extensions: [StarterKit, TextStyle, FontSize, FontFamily],
    content,
  });
  const e = editor;
  const Host = defineComponent({
    setup() {
      provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () => h(component as never, { editor: e });
    },
  });
  mount(Host, { global: { stubs: { ToolbarDropdownButton: DropdownStub } } });
  return e;
}

const activeKey = () => captured.value.items.find((i) => i.active)?.key;

describe("FontSizeSelect 跟随选区", () => {
  it("光标在不同字号之间移动时回显同步更新", async () => {
    const e = mountSelect(
      FontSizeSelect,
      '<p><span style="font-size: 28px">大字</span><span style="font-size: 12px">小字</span></p>',
    );

    e.commands.setTextSelection(2);
    await nextTick();
    expect(activeKey(), "光标在 28px 段").toBe("28px");

    e.commands.setTextSelection(4);
    await nextTick();
    expect(activeKey(), "光标移到 12px 段").toBe("12px");
  });

  it("移到没有字号的文字上回落到默认值", async () => {
    const e = mountSelect(FontSizeSelect, '<p><span style="font-size: 28px">大</span>普通</p>');
    e.commands.setTextSelection(2);
    await nextTick();
    expect(activeKey()).toBe("28px");

    e.commands.setTextSelection(4);
    await nextTick();
    expect(activeKey()).toBe("16px");
  });
});

describe("FontFamilySelect 跟随选区", () => {
  it("光标在不同字体之间移动时回显同步更新", async () => {
    const e = mountSelect(
      FontFamilySelect,
      '<p><span style="font-family: SimHei">黑体</span><span style="font-family: Arial">Arial</span></p>',
    );

    e.commands.setTextSelection(2);
    await nextTick();
    expect(activeKey()).toBe("SimHei");

    e.commands.setTextSelection(5);
    await nextTick();
    expect(activeKey()).toBe("Arial");
  });
});
