import { afterEach, beforeAll, describe, expect, it } from "vitest";

import YanivEditor from "@/core/YanivEditor.vue";
import YanivInlineEditor from "@/core/YanivInlineEditor.vue";
import { installBrowserStubs, mountEditor, unmountAll } from "@/testing/mountEditor";

beforeAll(installBrowserStubs);
afterEach(unmountAll);

describe("YanivEditor 挂载与阶段", () => {
  it("edit 阶段渲染出可编辑正文与顶栏", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "basic" });

    expect(wrapper.find(".yaniv-editor").exists()).toBe(true);
    expect(wrapper.find(".yaniv-editor").attributes("data-phase")).toBe("edit");
    expect(wrapper.find(".ProseMirror").exists()).toBe(true);
    expect(wrapper.find(".ProseMirror").attributes("contenteditable")).toBe("true");
  });

  it("preview 阶段正文只读且不渲染编辑期 chrome", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "preview", preset: "full" });

    expect(wrapper.find(".yaniv-editor").attributes("data-phase")).toBe("preview");
    expect(wrapper.find(".ProseMirror").attributes("contenteditable")).toBe("false");
    expect(wrapper.find(".editor-toolbar").exists()).toBe(false);
  });

  it("appearance 映射为根节点 class，colorMode 映射为 data-color-mode", async () => {
    const wrapper = await mountEditor(YanivEditor, { appearance: "word", colorMode: "dark" });

    const root = wrapper.find(".yaniv-editor");
    expect(root.classes()).toContain("appearance-word");
    expect(root.attributes("data-color-mode")).toBe("dark");
  });

  it("zIndexBase 写入根节点的 --ye-z-base", async () => {
    const wrapper = await mountEditor(YanivEditor, { zIndexBase: 3000 });

    const root = wrapper.find(".yaniv-editor").element as HTMLElement;
    expect(root.style.getPropertyValue("--ye-z-base")).toBe("3000");
  });

  it("initialContent 为 HTML 时被解析进文档", async () => {
    const wrapper = await mountEditor(YanivEditor, {
      initialContent: "<p>hello enterprise</p>",
    });

    expect(wrapper.find(".ProseMirror").text()).toContain("hello enterprise");
  });

  it("暴露 getJSON / getHTML / getText", async () => {
    const wrapper = await mountEditor(YanivEditor, { initialContent: "<p>abc</p>" });
    const vm = wrapper.vm as unknown as {
      getJSON: () => unknown;
      getHTML: () => string;
      getText: () => string;
    };

    expect(vm.getText()).toContain("abc");
    expect(vm.getHTML()).toContain("abc");
    expect(vm.getJSON()).toMatchObject({ type: "doc" });
  });

  it("overlay portal 先于 chrome 挂载，供浮层 appendTo 使用", async () => {
    const wrapper = await mountEditor(YanivEditor, {});

    const root = wrapper.find(".yaniv-editor").element;
    expect(root.firstElementChild?.className).toContain("yaniv-editor__overlay-portal");
  });
});

describe("YanivInlineEditor", () => {
  it("默认工具栏渲染，正文可编辑", async () => {
    const wrapper = await mountEditor(YanivInlineEditor, {
      content: "<p>inline</p>",
      mode: "edit",
    });

    expect(wrapper.find(".yaniv-inline-editor").exists()).toBe(true);
    expect(wrapper.find(".ProseMirror").text()).toContain("inline");
  });

  it("preview 阶段不渲染工具栏", async () => {
    const wrapper = await mountEditor(YanivInlineEditor, {
      content: "<p>inline</p>",
      mode: "preview",
    });

    expect(wrapper.find(".inline-toolbar").exists()).toBe(false);
    expect(wrapper.find(".ProseMirror").attributes("contenteditable")).toBe("false");
  });

  it("宿主传入的 HTML 中危险属性不会进入正文", async () => {
    const wrapper = await mountEditor(YanivInlineEditor, {
      content: '<p>ok</p><img src="x" onerror="globalThis.__inlinePwned = true">',
    });

    expect(wrapper.find(".ProseMirror").html()).not.toContain("onerror");
    expect((globalThis as Record<string, unknown>).__inlinePwned).toBeUndefined();
  });
});
