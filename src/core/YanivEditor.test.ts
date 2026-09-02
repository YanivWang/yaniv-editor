import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import YanivEditor from "@/core/YanivEditor.vue";
import YanivInlineEditor from "@/core/YanivInlineEditor.vue";
import { installBrowserStubs, mountEditor, unmountAll } from "@/testing/mountEditor";

import type { Editor } from "@tiptap/vue-3";
import type { VueWrapper } from "@vue/test-utils";

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

/**
 * 宿主切换语言会把编辑器整个重建一次——这是 `locale` prop 唯一的落地方式，
 * 而它同时踩到三条独立的路径，用户看到的都是"东西没了"：
 *
 * 1. 语言**代码**同步变（`sessionKey` 立刻变），语言**包**异步落地，两次 rebuild 重叠；
 * 2. `EditorEditChrome` 的 `:key` 与 `editor` 置 null 同时发生，若让 chrome 带着
 *    `editor === null` 再渲染一帧，浮层会 patch 到已被摘走的容器上抛错，
 *    而那个错会让 `await nextTick()` reject、`rebuild()` 永久停在 loading；
 * 3. `initialContent` 被当成受控源，每次 session ready 都重灌一遍。
 *
 * 这个用例只断言用户能看见的结果：切完语言，人还在编辑器里，写的东西还在。
 */
describe("切换语言不影响正在编辑的内容", () => {
  async function settle(rounds = 50): Promise<void> {
    for (let i = 0; i < rounds; i += 1) {
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  function editorOf(w: VueWrapper): Editor | null {
    return (w.vm as unknown as { getEditor?: () => Editor | null }).getEditor?.() ?? null;
  }

  it("full 编辑器：切语言后编辑器仍就绪，用户写的内容还在", async () => {
    const wrapper = await mountEditor(YanivEditor, {
      locale: "zh-CN",
      initialContent: "<p>初始</p>",
    });
    const before = editorOf(wrapper)!;
    before.chain().insertContent("用户写的内容").run();
    await nextTick();
    expect(before.getHTML()).toContain("用户写的内容");

    await wrapper.setProps({ locale: "en-US" });
    await settle();

    const after = editorOf(wrapper);
    expect(after).not.toBeNull();
    // 卡在 loading 时骨架屏会一直挂着，editor 永远建不出来
    expect(wrapper.find(".yaniv-editor__skeleton").exists()).toBe(false);
    expect(after!.getHTML()).toContain("用户写的内容");
  });

  /**
   * 与上一条是同一枚硬币的两面，缺一条就会改错另一条。
   *
   * 「session 重建后不要重灌 initialContent」不能写成「只在首次就绪时灌」：
   * `sessionReady` 这个 watch 还兜着「重建期间错过的源变更」——重建时它是 false，
   * `watch(controlledSource)` 会早退，全靠就绪后补灌。demo 页面的 `initialContent`
   * 是 `computed(() => getSampleContent(preset))`，切 preset 时**源本身变了**且同时
   * 触发重建，按「只灌一次」写会让新示例内容永远进不去（曾因此打穿 6 个 e2e）。
   * 判据必须是「这份源灌过没有」，不是「第几次就绪」。
   */
  it("宿主同时改 preset 与 initialContent：新内容仍然生效", async () => {
    const wrapper = await mountEditor(YanivEditor, {
      preset: "basic",
      initialContent: "<p>旧的示例内容</p>",
    });
    expect(editorOf(wrapper)!.getHTML()).toContain("旧的示例内容");

    // preset 变 → gates 变 → sessionKey 变 → 重建；initialContent 同时换新
    await wrapper.setProps({ preset: "notion", initialContent: "<p>新的示例内容</p>" });
    await settle();

    expect(editorOf(wrapper)!.getHTML()).toContain("新的示例内容");
  });

  it("full 编辑器：切语言后旧编辑器实例被销毁，不泄漏", async () => {
    const wrapper = await mountEditor(YanivEditor, {
      locale: "zh-CN",
      initialContent: "<p>初始</p>",
    });
    const before = editorOf(wrapper)!;
    expect(before.isDestroyed).toBe(false);

    await wrapper.setProps({ locale: "en-US" });
    await settle();

    expect(editorOf(wrapper)).not.toBe(before);
    expect(before.isDestroyed).toBe(true);
  });
});
