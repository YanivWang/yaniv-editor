// @vitest-environment jsdom

/**
 * 图片气泡菜单：对齐、预览、删除。
 *
 * 对齐状态有两个来源——图片节点自己的 `align`，和它所在段落的 `textAlign`。
 * 读错来源，按钮的高亮就会和实际显示对不上（用户点了居中，按钮却还亮在左对齐）。
 */
import { TextAlign } from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { computed, defineComponent, h, nextTick, provide, ref, shallowRef } from "vue";

import { editorAppearanceInjectionKey } from "@/appearance";
import type { EditorColorMode } from "@/configs/editorConfig";
import { provideEditorRoot, provideOverlayPortal, provideYanivEditor } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { ResizableImage } from "@/extensions/resizableImage";
import {
  installBrowserStubs,
  installLayoutStubs,
  waitForLocaleMessages,
} from "@/testing/mountEditor";

import ImageToolbar from "./ImageToolbar.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

let editor: Editor | null = null;
let wrapper: VueWrapper | null = null;

async function mountToolbar(content: string): Promise<Editor> {
  const host = document.createElement("div");
  document.body.append(host);
  editor = new Editor({
    element: host,
    extensions: [
      StarterKit,
      ResizableImage.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
  });

  const editorRef = shallowRef<Editor | null>(editor);
  let localeCtx: { messages: { value: unknown } } | null = null;

  const Host = defineComponent({
    setup() {
      const root = document.createElement("div");
      root.className = EDITOR_ROOT_CLASS;
      const portal = document.createElement("div");
      portal.className = OVERLAY_PORTAL_CLASS;
      root.append(portal);
      document.body.append(root);

      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));
      provideYanivEditor(editorRef);
      provide(editorAppearanceInjectionKey, {
        appearance: ref("default" as const),
        colorMode: ref<EditorColorMode>("light"),
        resolvedMode: computed(() => "light" as const),
      });
      localeCtx = provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () => h(ImageToolbar);
    },
  });

  wrapper = mount(Host, {
    attachTo: document.body,
    global: { stubs: { BubbleMenu: { template: "<div><slot /></div>" } } },
  });
  await waitForLocaleMessages(localeCtx!);
  return editor;
}

function menuButton(title: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>(".image-menu-btn")].find(
    (button) => button.getAttribute("title") === title,
  );
  if (!found) {
    const titles = [...document.querySelectorAll<HTMLButtonElement>(".image-menu-btn")].map((b) =>
      b.getAttribute("title"),
    );
    throw new Error(`没有找到「${title}」按钮；现有：${titles.join(" / ")}`);
  }
  return found;
}

function activeAlignTitles(): string[] {
  return [...document.querySelectorAll<HTMLButtonElement>(".image-menu-btn.active")].map(
    (button) => button.getAttribute("title") ?? "",
  );
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

const withImage = '<p>前</p><img src="https://a.example.com/x.png"><p>后</p>';

describe("对齐", () => {
  it("设置对齐会写进图片节点的属性", async () => {
    const target = await mountToolbar(withImage);
    expect(target.getHTML(), "测试文档里应当解析出 image 节点").toContain("<img");
    target.commands.setNodeSelection(3);

    menuButton("居中对齐").click();
    await nextTick();

    expect(target.getHTML()).toContain('data-align="center"');
  });

  it("三个方向各写各的值", async () => {
    const target = await mountToolbar(withImage);
    target.commands.setNodeSelection(3);

    menuButton("右对齐").click();
    await nextTick();
    expect(target.getHTML()).toContain('data-align="right"');

    menuButton("左对齐").click();
    await nextTick();
    expect(target.getHTML()).toContain('data-align="left"');
  });

  it("当前对齐在按钮上高亮，且只亮一个", async () => {
    const target = await mountToolbar(withImage);
    target.commands.setNodeSelection(3);

    menuButton("居中对齐").click();
    await nextTick();

    expect(activeAlignTitles()).toEqual(["居中对齐"]);
  });

  /**
   * ⚠️ 这条锁的是**行为**。源码里 `if (!node || pos === null) return` 是双保险：
   * 去掉它、退化成 `applyImageAlign(e, pos ?? 0, align)` 时用例也不转红——
   * `updateAttributes("image", …)` 对非 image 节点本来就不生效。
   * 如实记下，不为了「覆盖」它去凑测试。
   */
  it("没选中图片时点对齐不改文档", async () => {
    const target = await mountToolbar(withImage);
    target.commands.setTextSelection(1);
    const before = target.getHTML();

    menuButton("居中对齐").click();
    await nextTick();

    expect(target.getHTML()).toBe(before);
  });
});

describe("预览与删除", () => {
  it("删除移除被选中的图片，前后段落留着", async () => {
    const target = await mountToolbar(withImage);
    target.commands.setNodeSelection(3);

    menuButton("删除图片").click();
    await nextTick();

    expect(target.getHTML()).not.toContain("<img");
    expect(target.getHTML()).toContain("前");
    expect(target.getHTML()).toContain("后");
  });

  it("预览弹窗带上图片地址", async () => {
    const target = await mountToolbar(withImage);
    target.commands.setNodeSelection(3);

    menuButton("预览").click();
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await nextTick();
      if (document.querySelector(".ant-modal img")) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(document.querySelector(".ant-modal img")?.getAttribute("src")).toBe(
      "https://a.example.com/x.png",
    );
  });

  it("没选中图片时点预览不弹窗", async () => {
    const target = await mountToolbar(withImage);
    target.commands.setTextSelection(1);

    menuButton("预览").click();
    await nextTick();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(document.querySelector(".ant-modal-wrap")).toBeNull();
  });
});
