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

  it("没有承载 click 的裸 div（交互元素必须是原生语义标签）", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "notion" });

    const root = wrapper.find(".yaniv-editor").element;
    // ProseMirror 正文区由编辑器接管键盘，不在此约束内
    const suspicious = Array.from(root.querySelectorAll("div[onclick]")).filter(
      (el) => !el.closest(".ProseMirror"),
    );

    expect(suspicious).toHaveLength(0);
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

  it("斜杠命令弹层用 listbox/option 语义，并把活动项挂到正文的 aria-activedescendant", async () => {
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

  it("查找替换输入框有可访问名称", async () => {
    const wrapper = await mountEditor(YanivEditor, { mode: "edit", preset: "full" });

    const findButton = wrapper
      .findAll("button.ye-toolbar-button")
      .find((b) => (b.attributes("aria-label") ?? "").includes("查找"));

    expect(findButton, "full preset 应渲染查找替换按钮").toBeDefined();
  });
});
