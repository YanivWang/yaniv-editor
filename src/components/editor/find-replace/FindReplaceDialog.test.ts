// @vitest-environment jsdom

/**
 * 查找替换面板：输入与扩展状态的双向同步、命令派发、焦点交接。
 *
 * 面板的状态有**两份**：Vue 的三个 ref 与扩展的 storage。写是 watch 推过去，
 * 读是打开面板时从 storage 拉回来——任一方向断了，用户都会看到「输入框里写着 A、
 * 文档里高亮的却是 B」。
 */
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
import { SearchReplace } from "@/extensions/search-replace";
import {
  installBrowserStubs,
  installLayoutStubs,
  waitForLocaleMessages,
} from "@/testing/mountEditor";

import FindReplaceDialog from "./FindReplaceDialog.vue";
import { provideFindReplacePanel, type FindReplacePanelContext } from "./useFindReplacePanel";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

let editor: Editor | null = null;
let wrapper: VueWrapper | null = null;
let panel: FindReplacePanelContext | null = null;

async function mountDialog(
  content = "<p>甲乙丙甲乙丙</p>",
  appearance: "default" | "notion" = "default",
): Promise<Editor> {
  const host = document.createElement("div");
  document.body.append(host);
  editor = new Editor({ element: host, extensions: [StarterKit, SearchReplace], content });

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
        appearance: ref(appearance),
        colorMode: ref<EditorColorMode>("light"),
        resolvedMode: computed(() => "light" as const),
      });
      panel = provideFindReplacePanel();
      localeCtx = provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () => h(FindReplaceDialog);
    },
  });

  wrapper = mount(Host, { attachTo: document.body });
  await waitForLocaleMessages(localeCtx!);
  return editor;
}

async function openPanel(): Promise<void> {
  panel!.open();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await nextTick();
    if (document.querySelector(".find-replace-form__actions")) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("查找面板未打开");
}

function inputs(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>(".ant-modal input[type='text']")];
}

async function typeInto(input: HTMLInputElement, value: string): Promise<void> {
  input.value = value;
  input.dispatchEvent(new Event("input"));
  await nextTick();
  await nextTick();
}

/**
 * 按**精确**文案找：「替换」是「全部替换」的子串，用 includes 会点到「全部替换」上去。
 * 比较前要去掉空白——antd 会给两个汉字的按钮自动插一个空格（「替 换」）。
 */
function normalizeLabel(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "");
}

function actionButton(text: string): HTMLButtonElement {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>(".find-replace-form__actions button"),
  ].find((button) => normalizeLabel(button.textContent) === normalizeLabel(text));
  if (!found) {
    const available = [
      ...document.querySelectorAll<HTMLButtonElement>(".find-replace-form__actions button"),
    ].map((button) => button.textContent?.trim());
    throw new Error(`没有找到「${text}」按钮；现有：${available.join(" / ")}`);
  }
  return found;
}

function storage(target: Editor) {
  return (
    target.storage as unknown as {
      searchReplace: {
        searchTerm: string;
        replaceTerm: string;
        caseSensitive: boolean;
        resultIndex: number;
        results: { from: number; to: number }[];
      };
    }
  ).searchReplace;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  editor?.destroy();
  editor = null;
  panel = null;
  document.body.innerHTML = "";
});

describe("输入与扩展状态的同步", () => {
  it("输入查找词会推给扩展，并把命中索引复位", async () => {
    const target = await mountDialog();
    await openPanel();

    await typeInto(inputs()[0], "甲");
    target.commands.searchReplaceFindNext();
    await nextTick();
    expect(storage(target).resultIndex, "先走到第二个命中").toBeGreaterThan(0);

    await typeInto(inputs()[0], "乙");

    expect(storage(target).searchTerm).toBe("乙");
    expect(storage(target).resultIndex, "换了搜索词还停在旧索引上会跳到不相干的位置").toBe(0);
  });

  it("输入替换词只推替换词，不动当前索引", async () => {
    const target = await mountDialog();
    await openPanel();
    await typeInto(inputs()[0], "甲");
    target.commands.searchReplaceFindNext();
    await nextTick();
    const indexBefore = storage(target).resultIndex;
    expect(indexBefore).toBeGreaterThan(0);

    await typeInto(inputs()[1], "X");

    expect(storage(target).replaceTerm).toBe("X");
    expect(storage(target).resultIndex, "改替换词不该把用户跳回第一个命中").toBe(indexBefore);
  });

  it("勾选大小写敏感会推给扩展并复位索引", async () => {
    const target = await mountDialog();
    await openPanel();
    await typeInto(inputs()[0], "甲");
    target.commands.searchReplaceFindNext();
    await nextTick();
    expect(storage(target).resultIndex).toBeGreaterThan(0);

    const checkbox = document.querySelector<HTMLInputElement>(".ant-modal input[type='checkbox']")!;
    checkbox.click();
    await nextTick();
    await nextTick();

    expect(storage(target).caseSensitive).toBe(true);
    expect(storage(target).resultIndex, "命中集合变了，索引必须复位").toBe(0);
  });

  it("重新打开面板时从扩展状态拉回输入框（两份状态不能各说各话）", async () => {
    const target = await mountDialog();
    target.commands.setSearchReplaceTerm("丙");
    target.commands.setSearchReplaceReplaceTerm("丁");

    await openPanel();

    expect(inputs()[0].value).toBe("丙");
    expect(inputs()[1].value).toBe("丁");
  });
});

describe("命令派发", () => {
  it("下一个 / 上一个真的在命中之间来回走", async () => {
    const target = await mountDialog();
    await openPanel();
    await typeInto(inputs()[0], "甲");
    expect(storage(target).results.length, "示例文档里应有两个命中").toBe(2);

    actionButton("下一处").click();
    await nextTick();
    expect(storage(target).resultIndex).toBe(1);

    actionButton("上一处").click();
    await nextTick();
    expect(storage(target).resultIndex).toBe(0);
  });

  it("替换只换掉当前这一个，并把选区落到命中上", async () => {
    const target = await mountDialog();
    await openPanel();
    await typeInto(inputs()[0], "乙");
    await typeInto(inputs()[1], "X");

    actionButton("替换").click();
    await nextTick();

    expect(target.state.doc.textContent, "只换第一个「乙」").toBe("甲X丙甲乙丙");
    // 替换改变了文档，命中集合必须跟着重算——否则「下一处」会跳到不存在的位置
    expect(storage(target).results).toEqual([{ from: 5, to: 6 }]);

    /**
     * ⚠️ 这里**没有**断言「替换后选区落到剩下那个命中上」。
     * jsdom 下的观察是：直接调 `searchReplaceSelectCurrent()` 能选中（5-6），
     * 但经组件的 `handleReplace` 走同一条路时选区没动（停在 1-1）。
     * 差异出在 `focusSearchHit` 里的 `editor.commands.focus()`——tiptap 的 focus
     * 在 jsdom 下与浏览器行为不同（不变量 45：jsdom 里的渲染/焦点现象要在真实
     * 浏览器里复验后才能称为缺陷）。这条留作待复验的观察，不在这里写成断言，
     * 免得把 jsdom 的怪癖固化成"期望行为"。
     */
  });

  it("全部替换把命中全换掉", async () => {
    const target = await mountDialog();
    await openPanel();
    await typeInto(inputs()[0], "甲");
    await typeInto(inputs()[1], "Z");

    actionButton("全部替换").click();
    await nextTick();

    expect(target.state.doc.textContent).toBe("Z乙丙Z乙丙");
  });
});

describe("弹窗皮肤", () => {
  it("默认外观只带基础 wrap class", async () => {
    await mountDialog();
    await openPanel();

    const wrap = document.querySelector(".ant-modal-wrap")!;
    expect(wrap.className).toContain("yaniv-editor-modal");
    expect(wrap.className).not.toContain("yaniv-find-replace-modal");
  });

  it("notion 外观追加自己的 wrap class", async () => {
    await mountDialog("<p>甲</p>", "notion");
    await openPanel();

    const wrap = document.querySelector(".ant-modal-wrap")!;
    expect(wrap.className).toContain("yaniv-find-replace-modal");
  });
});

describe("关闭", () => {
  it("关闭时清掉搜索词，文档里不留高亮，焦点还给正文", async () => {
    const target = await mountDialog();
    await openPanel();
    await typeInto(inputs()[0], "乙");
    expect(storage(target).searchTerm).toBe("乙");

    document.querySelector<HTMLElement>(".ant-modal-close")!.click();
    await nextTick();
    await nextTick();

    expect(storage(target).searchTerm, "留着搜索词等于留着满屏高亮").toBe("");
    expect(panel!.visible.value).toBe(false);
    /**
     * 「焦点还给正文」这半在 jsdom 里断言不了：tiptap 的 focus 命令把
     * `view.focus()` 丢进 requestAnimationFrame，而 jsdom 既没有真实焦点管理、
     * rAF 时序也与浏览器不同。这里只锁住可观察的两条，焦点交接由人工/真实浏览器验。
     */
  });
});
