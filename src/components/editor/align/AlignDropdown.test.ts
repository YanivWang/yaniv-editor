/**
 * 对齐下拉的菜单项必须带选中态。
 *
 * 按钮图标会跟着当前对齐变，但菜单**打开后**没有 `active` 就看不出选中哪一项
 * ——本仓库其它下拉（代码块 / 上下标 / 标题）都设了它。
 */
import { TextAlign } from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";

import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";

import AlignDropdown from "./AlignDropdown.vue";

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

/** 用桩替掉 ToolbarDropdownButton，把它收到的 items 暴露出来断言 */
const captured = ref<MenuItemConfig[]>([]);
const DropdownStub = defineComponent({
  props: { items: { type: Array, default: () => [] } },
  setup(props) {
    captured.value = props.items as MenuItemConfig[];
    return () => h("div");
  },
});

function mountWith(align: "left" | "center" | "right" | "justify") {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({
    element: el,
    extensions: [StarterKit, TextAlign.configure({ types: ["heading", "paragraph"] })],
    content: "<p>文字</p>",
  });
  editor.commands.setTextSelection(2);
  editor.commands.setTextAlign(align);

  const e = editor;
  // 组件用 useEditorT()，必须在祖先里提供 locale 上下文
  const Host = defineComponent({
    setup() {
      provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () => h(AlignDropdown, { editor: e });
    },
  });

  return mount(Host, {
    global: { stubs: { ToolbarDropdownButton: DropdownStub } },
  });
}

describe("AlignDropdown", () => {
  it("四个菜单项都带 active 字段", () => {
    mountWith("left");
    expect(captured.value).toHaveLength(4);
    for (const item of captured.value) {
      expect(item, `${item.key} 应声明 active`).toHaveProperty("active");
      expect(typeof item.active).toBe("boolean");
    }
  });

  it("当前对齐方式对应的项被标记为选中，且只有一项", () => {
    for (const align of ["left", "center", "right", "justify"] as const) {
      mountWith(align);
      const active = captured.value.filter((i) => i.active);
      expect(active, `${align} 应恰有一项选中`).toHaveLength(1);
      expect(active[0].key).toBe(`align-${align}`);
      editor?.destroy();
      editor = null;
    }
  });
});
