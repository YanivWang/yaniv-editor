import { afterEach, beforeAll, describe, expect, it } from "vitest";

import YanivEditor from "@/core/YanivEditor.vue";
import {
  accessibleName,
  installBrowserStubs,
  mountEditor,
  unmountAll,
} from "@/testing/mountEditor";

beforeAll(installBrowserStubs);
afterEach(unmountAll);

describe("无障碍基线", () => {
  it("工具栏容器具备 toolbar 语义与可访问名称", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });

    const toolbar = wrapper.find('[role="toolbar"]');
    expect(toolbar.exists()).toBe(true);
    expect(accessibleName(toolbar.element)).not.toBe("");
  });

  it("所有按钮都有可访问名称 —— 图标按钮不得只有图形", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });

    const unnamed = wrapper
      .findAll("button")
      .filter((b) => b.element.getAttribute("aria-hidden") !== "true")
      .filter((b) => accessibleName(b.element) === "")
      .map((b) => b.element.className);

    expect(unnamed, `以下按钮缺少可访问名称: ${unnamed.join(" | ")}`).toEqual([]);
  });

  /**
   * 声明了交互 role 的元素必须能被键盘聚焦，否则读屏用户能听见"按钮"却永远走不到它。
   *
   * 这里**不能**用 `div[onclick]` 去找裸 div：Vue 的 `@click` 编译成 addEventListener，
   * 不会反射成 `onclick` 内容属性——实测一个 `@click` 的 div 渲染结果就是
   * `<div>…</div>`，`div[onclick]` 恒为 0 命中，那样写的断言永远不会失败。
   * 「交互元素必须用原生语义标签」这条由 `eslint-plugin-vuejs-accessibility` 在 lint 阶段
   * 强制（见 CONTRIBUTING 约定 5），单测这一层改为覆盖它查不到的运行时可聚焦性。
   */
  it("声明交互 role 的元素必须可聚焦", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });

    const root = wrapper.find(".yaniv-editor").element;
    const NATIVELY_FOCUSABLE = "button, a[href], input, select, textarea";
    const INTERACTIVE_ROLES = '[role="button"], [role="menuitem"], [role="option"], [role="tab"]';

    const unreachable = Array.from(root.querySelectorAll(INTERACTIVE_ROLES))
      // ProseMirror 正文区由编辑器自己接管键盘，不在此约束内
      .filter((el) => !el.closest(".ProseMirror"))
      .filter((el) => !el.matches(NATIVELY_FOCUSABLE))
      .filter((el) => !el.hasAttribute("tabindex"))
      .map((el) => `${el.tagName.toLowerCase()}[role=${el.getAttribute("role")}].${el.className}`);

    expect(unreachable, `以下元素有交互 role 但键盘不可达: ${unreachable.join(" | ")}`).toEqual([]);
  });

  it("切换类按钮用 aria-pressed 表达激活态", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "basic" });

    const toggles = wrapper
      .findAll("button.ye-toolbar-button")
      .filter((b) => b.attributes("aria-pressed") !== undefined);

    expect(toggles.length).toBeGreaterThan(0);
    for (const button of toggles) {
      expect(["true", "false"]).toContain(button.attributes("aria-pressed"));
    }
  });

  it("下拉按钮声明 haspopup 与展开态", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });

    const dropdowns = wrapper.findAll("button.ye-dropdown-btn");
    expect(dropdowns.length).toBeGreaterThan(0);
    for (const button of dropdowns) {
      expect(button.attributes("aria-haspopup")).toBe("menu");
      expect(button.attributes("aria-expanded")).toBeDefined();
    }
  });

  it("preview 阶段正文仍可被读取与选择", async () => {
    const wrapper = await mountEditor(YanivEditor, {
      mode: "preview",
      initialContent: "<p>可读内容</p>",
    });

    const content = wrapper.find(".ProseMirror");
    expect(content.attributes("contenteditable")).toBe("false");
    expect(content.text()).toContain("可读内容");
  });

  // 弹层开启后的 listbox/option 语义由 BlockPickerMenu.test.ts 覆盖；
  // 这里只断言**未开启时**不残留失效的 ARIA 引用（指向不存在的 id 会让读屏播报错乱）
  it("斜杠菜单未开启时，正文不残留失效的 ARIA 引用", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });

    const editor = (
      wrapper.vm as unknown as { getEditor: () => { commands: Record<string, unknown> } | null }
    ).getEditor();
    expect(editor).not.toBeNull();

    const content = wrapper.find(".ProseMirror").element;
    // 菜单未开启时，正文不应残留失效的 ARIA 引用
    expect(content.hasAttribute("aria-activedescendant")).toBe(false);
    expect(content.hasAttribute("aria-expanded")).toBe(false);
  });

  // 断言的是**按钮**的可访问名称；对话框内输入框的名称需要打开弹层，由 E2E 覆盖
  it("查找替换按钮有可访问名称", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });

    const findButton = wrapper
      .findAll("button.ye-toolbar-button")
      .find((b) => (b.attributes("aria-label") ?? "").includes("查找"));

    expect(findButton, "full preset 应渲染查找替换按钮").toBeDefined();
  });
});
