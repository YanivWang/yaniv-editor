// @vitest-environment jsdom

/**
 * 公式节点视图：显示 / 编辑两态的切换，以及键盘可达性。
 *
 * 显示态是个 `<button>`，可访问名是「编辑公式」——那就必须**真的**能用键盘编辑。
 * 原先只有 `dblclick` 能进编辑，而双击没有键盘等价物：键盘用户激活按钮只会选中节点，
 * 名不符实。空公式的占位文案也一直写着「点击编辑公式」，而单击并不进编辑。
 */
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import {
  installBrowserStubs,
  installLayoutStubs,
  waitForLocaleMessages,
} from "@/testing/mountEditor";

import MathNodeView from "./MathNodeView.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

let wrapper: VueWrapper | null = null;

interface NodeStub {
  attrs: { latex: string; block: boolean };
}

const updateAttributes = vi.fn();
const setNodeSelection = vi.fn();

async function mountView(latex: string, options: { editable?: boolean; block?: boolean } = {}) {
  updateAttributes.mockClear();
  setNodeSelection.mockClear();

  const node: NodeStub = { attrs: { latex, block: options.block ?? false } };
  const editor = {
    isEditable: options.editable ?? true,
    commands: { setNodeSelection },
  };

  let localeCtx: { messages: { value: unknown } } | null = null;
  const Host = defineComponent({
    setup() {
      localeCtx = provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () =>
        h(MathNodeView, {
          node,
          editor,
          updateAttributes,
          getPos: () => 3,
          selected: false,
          extension: { options: {} },
          decorations: [],
          view: {},
          innerDecorations: [],
          HTMLAttributes: {},
        } as never);
    },
  });

  wrapper = mount(Host, { attachTo: document.body });

  await waitForLocaleMessages(localeCtx!);
  return { node };
}

function display() {
  return wrapper!.find(".math-display");
}

function editorPane() {
  return wrapper!.find(".math-editor");
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("显示态", () => {
  it("有公式时渲染公式，按钮带可访问名", async () => {
    await mountView("E = mc^2");

    expect(display().exists()).toBe(true);
    expect(display().attributes("aria-label")).toBe("编辑公式");
    expect(editorPane().exists()).toBe(false);
  });

  it("空公式在可编辑时自动进入编辑态", async () => {
    await mountView("");

    expect(editorPane().exists()).toBe(true);
  });

  it("只读时空公式不自动进入编辑态", async () => {
    await mountView("", { editable: false });

    expect(editorPane().exists()).toBe(false);
    expect(display().text()).toContain("双击编辑公式");
  });

  it("单击只选中节点，不进编辑（鼠标那条交互没变）", async () => {
    await mountView("E = mc^2");

    await display().trigger("click");

    expect(setNodeSelection).toHaveBeenCalledWith(3);
    expect(editorPane().exists()).toBe(false);
  });

  it("双击进入编辑态", async () => {
    await mountView("E = mc^2");

    await display().trigger("dblclick");

    expect(editorPane().exists()).toBe(true);
    expect((wrapper!.find("textarea").element as HTMLTextAreaElement).value).toBe("E = mc^2");
  });

  it("键盘 Enter 进入编辑态（按钮的可访问名承诺了这件事）", async () => {
    await mountView("E = mc^2");

    await display().trigger("keydown", { key: "Enter" });

    expect(editorPane().exists()).toBe(true);
  });

  it("键盘空格同样进入编辑态", async () => {
    await mountView("E = mc^2");

    await display().trigger("keydown", { key: " " });

    expect(editorPane().exists()).toBe(true);
  });

  it("只读时键盘也进不去编辑态", async () => {
    await mountView("E = mc^2", { editable: false });

    await display().trigger("keydown", { key: "Enter" });

    expect(editorPane().exists()).toBe(false);
  });
});

describe("编辑态", () => {
  it("改了内容点保存：写回属性并回到显示态", async () => {
    await mountView("");
    const textarea = wrapper!.find("textarea");

    await textarea.setValue("a^2 + b^2");
    await wrapper!.find(".math-btn--save").trigger("click");

    expect(updateAttributes).toHaveBeenCalledWith({ latex: "a^2 + b^2" });
    expect(editorPane().exists()).toBe(false);
  });

  it("内容没变时不写属性（避免一次空事务）", async () => {
    await mountView("E = mc^2");
    await display().trigger("dblclick");

    await wrapper!.find(".math-btn--save").trigger("click");

    expect(updateAttributes).not.toHaveBeenCalled();
  });

  it("取消：不写属性，输入框内容回滚到节点值", async () => {
    await mountView("E = mc^2");
    await display().trigger("dblclick");
    await wrapper!.find("textarea").setValue("被改坏的内容");

    await wrapper!.find(".math-btn--cancel").trigger("click");

    expect(updateAttributes).not.toHaveBeenCalled();
    expect(editorPane().exists()).toBe(false);
  });

  it("Escape 等同于取消", async () => {
    await mountView("E = mc^2");
    await display().trigger("dblclick");
    await wrapper!.find("textarea").setValue("x");

    await wrapper!.find("textarea").trigger("keydown", { key: "Escape" });

    expect(updateAttributes).not.toHaveBeenCalled();
    expect(editorPane().exists()).toBe(false);
  });

  it("Ctrl+Enter 与 Cmd+Enter 都能保存（Mac 上按的是 Cmd）", async () => {
    await mountView("");
    await wrapper!.find("textarea").setValue("x^2");
    await wrapper!.find("textarea").trigger("keydown", { key: "Enter", ctrlKey: true });
    expect(updateAttributes).toHaveBeenCalledWith({ latex: "x^2" });

    await mountView("");
    await wrapper!.find("textarea").setValue("y^2");
    await wrapper!.find("textarea").trigger("keydown", { key: "Enter", metaKey: true });
    expect(updateAttributes).toHaveBeenCalledWith({ latex: "y^2" });
  });

  it("失焦到编辑器外就保存", async () => {
    await mountView("");
    await wrapper!.find("textarea").setValue("z^2");

    await wrapper!.find("textarea").trigger("blur", { relatedTarget: document.body });

    expect(updateAttributes).toHaveBeenCalledWith({ latex: "z^2" });
  });

  it("失焦到编辑面板内部的按钮时不关闭（否则点不到「保存」）", async () => {
    await mountView("");
    await wrapper!.find("textarea").setValue("w^2");

    const saveButton = wrapper!.find(".math-btn--save").element;
    await wrapper!.find("textarea").trigger("blur", { relatedTarget: saveButton });

    expect(updateAttributes).not.toHaveBeenCalled();
    expect(editorPane().exists()).toBe(true);
  });

  it("预览区渲染当前输入，输入非法时显示错误而不是崩掉", async () => {
    await mountView("");

    await wrapper!.find("textarea").setValue("\\frac{1}{");
    await nextTick();

    const preview = wrapper!.find(".math-editor__preview");
    expect(preview.exists()).toBe(true);
    expect(preview.html().length).toBeGreaterThan(0);
  });
});
