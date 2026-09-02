// @vitest-environment jsdom

import TableOfContents from "@tiptap/extension-table-of-contents";
import UniqueID from "@tiptap/extension-unique-id";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import { OutlinePanel, provideOutlinePanel } from "./index";

import type { VueWrapper } from "@vue/test-utils";

/** jsdom 不实现 scrollIntoView；这里记录被滚动到视野的按钮 id */
const scrolledIds: string[] = [];

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value(this: Element) {
      scrolledIds.push(this.getAttribute("data-outline-id") ?? this.tagName);
    },
  });
});

let editor: Editor | null = null;
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  editor?.destroy();
  editor = null;
  scrolledIds.length = 0;
  document.body.innerHTML = "";
});

function mountPanel(content: string): Editor {
  const host = document.createElement("div");
  document.body.appendChild(host);

  editor = new Editor({
    element: host,
    extensions: [
      StarterKit,
      UniqueID.configure({ types: ["heading"] }),
      TableOfContents.configure({ anchorTypes: ["heading"] }),
    ],
    content,
  });

  const e = editor;
  wrapper = mount(
    defineComponent({
      setup() {
        provideEditorLocale(ref("zh-CN"));
        provideOutlinePanel(true);
        return () => h(OutlinePanel, { editor: e, scrollParent: () => null });
      },
    }),
    { attachTo: document.body },
  );

  return e;
}

/**
 * 高亮项的自动滚动 watcher 读的是**本次更新刚渲染出来**的按钮。
 *
 * 默认 pre 时机跑在组件重渲之前，DOM 还停在上一版；而下一轮 `syncItems` 的
 * `activeItemId` 没变会被 `id === prevId` 挡掉，这次滚动就永远补不回来。
 */
describe("OutlinePanel 高亮项自动滚入视野", () => {
  it("新敲出的标题成为高亮项时滚入视野（列表此前为空）", async () => {
    const e = mountPanel("<h1>First</h1><p>body</p>");
    await nextTick();

    e.chain()
      .focus()
      .setTextSelection(e.state.doc.content.size)
      .insertContent("<h2>Second</h2>")
      .run();
    await nextTick();
    await nextTick();

    const activeId = (
      e.storage as { tableOfContents?: { content?: { id: string; isActive: boolean }[] } }
    ).tableOfContents?.content?.find((item) => item.isActive)?.id;

    expect(activeId).toBeTruthy();
    expect(scrolledIds).toContain(activeId);
  });

  it("光标移到另一个已存在的标题时滚到对应条目", async () => {
    const e = mountPanel("<h1>Alpha</h1><p>body</p><h2>Beta</h2><p>tail</p>");
    // 触发一次 docChanged，让 TableOfContents 给标题分配 id
    e.chain().focus().setTextSelection(2).insertContent("!").run();
    await nextTick();
    await nextTick();
    scrolledIds.length = 0;

    // 把光标移进第二个标题
    let target = -1;
    e.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading" && node.textContent === "Beta") target = pos + 1;
    });
    expect(target).toBeGreaterThan(0);

    e.commands.setTextSelection(target);
    await nextTick();
    await nextTick();

    const activeId = (
      e.storage as { tableOfContents?: { content?: { id: string; textContent: string }[] } }
    ).tableOfContents?.content?.find((item) => item.textContent === "Beta")?.id;

    expect(activeId).toBeTruthy();
    expect(scrolledIds).toContain(activeId);
  });
});
