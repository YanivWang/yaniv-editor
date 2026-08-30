import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import YanivEditor from "@/core/YanivEditor.vue";
import {
  installBrowserStubs,
  installLayoutStubs,
  mountEditor,
  unmountAll,
} from "@/testing/mountEditor";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

afterEach(unmountAll);

/** 在正文里输入 `/` 触发斜杠命令；返回菜单是否出现 */
async function openSlashMenu(wrapper: VueWrapper): Promise<boolean> {
  const vm = wrapper.vm as unknown as { getEditor: () => import("@tiptap/vue-3").Editor | null };
  const editor = vm.getEditor();
  expect(editor).not.toBeNull();

  // 斜杠命令要求 `/` 位于段落开头（插件用 `^\/(\S*)$` 匹配段首文本）
  editor!.commands.setContent("<p></p>");
  editor!.commands.focus("end");
  editor!.commands.insertContent("/");

  // BlockPickerMenu 是 defineAsyncComponent，首次加载要等 chunk 解析；按时间预算轮询
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (document.querySelector(".block-picker-menu")) return true;
  }
  return false;
}

/** 确认某个 gate 对应的扩展是否真的注册进了当前 session */
function hasExtension(wrapper: VueWrapper, name: string): boolean {
  const vm = wrapper.vm as unknown as { getEditor: () => import("@tiptap/vue-3").Editor | null };
  return (vm.getEditor()?.extensionManager.extensions ?? []).some((e) => e.name === name);
}

describe("斜杠命令块选择菜单", () => {
  it("notion preset 注册斜杠命令扩展并能弹出菜单", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });

    expect(hasExtension(wrapper, "slashCommand")).toBe(true);
    expect(await openSlashMenu(wrapper)).toBe(true);
  });

  it("菜单具备 listbox 语义，选项带 option 角色与 aria-selected", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });
    await openSlashMenu(wrapper);

    const listbox = document.querySelector('.block-picker-list[role="listbox"]');
    expect(listbox).not.toBeNull();
    expect(listbox!.getAttribute("aria-label")).toBeTruthy();

    const options = listbox!.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(0);

    const selected = listbox!.querySelectorAll('[role="option"][aria-selected="true"]');
    expect(selected).toHaveLength(1);
  });

  it("正文通过 aria-activedescendant 指向当前高亮项", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });
    await openSlashMenu(wrapper);

    const content = document.querySelector(".ProseMirror")!;
    expect(content.getAttribute("aria-expanded")).toBe("true");

    const activeId = content.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();

    const active = document.getElementById(activeId!);
    expect(active).not.toBeNull();
    expect(active!.getAttribute("aria-selected")).toBe("true");
  });

  it("分组标题标记为 presentation，不污染选项序列", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });
    await openSlashMenu(wrapper);

    const titles = document.querySelectorAll(".block-picker-group-title");
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) {
      expect(title.getAttribute("role")).toBe("presentation");
    }
  });

  it("遮罩层对辅助技术隐藏", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });
    await openSlashMenu(wrapper);

    const backdrop = document.querySelector(".block-picker-backdrop");
    expect(backdrop).not.toBeNull();
    expect(backdrop!.getAttribute("aria-hidden")).toBe("true");
    expect(backdrop!.getAttribute("role")).toBe("presentation");
  });

  it("basic preset 不注册斜杠命令扩展", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "basic" });

    expect(hasExtension(wrapper, "slashCommand")).toBe(false);
    expect(hasExtension(wrapper, "dragHandle")).toBe(false);
  });

  it("菜单关闭后正文清除 ARIA 引用，不留失效指针", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });
    await openSlashMenu(wrapper);

    const content = document.querySelector(".ProseMirror")!;
    expect(content.getAttribute("aria-activedescendant")).toBeTruthy();

    const vm = wrapper.vm as unknown as { getEditor: () => import("@tiptap/vue-3").Editor | null };
    vm.getEditor()!.commands.setContent("<p>cleared</p>");

    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (!content.hasAttribute("aria-activedescendant")) break;
    }

    expect(content.hasAttribute("aria-activedescendant")).toBe(false);
    expect(content.hasAttribute("aria-expanded")).toBe(false);
  });
});
