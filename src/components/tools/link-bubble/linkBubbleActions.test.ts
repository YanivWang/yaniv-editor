// @vitest-environment jsdom

/**
 * 链接气泡菜单的三个动作：编辑、打开、移除。
 *
 * 这里驱动的是组件本身（不是把逻辑抄一遍），重点在两处容易漏的地方：
 * - **非法 URL 必须给提示**：不提示就是静默失败——弹窗还开着、链接没变，
 *   用户不知道自己输错了什么（同仓库 `ImageUpload` 的网络地址弹窗一直有这条提示）。
 * - **打开链接前要再过一次白名单**：`attrs.href` 可能来自宿主直接注入的 JSON，
 *   而 `window.open("javascript:…")` 会执行脚本。
 */
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, shallowRef } from "vue";

import { provideEditorRoot, provideOverlayPortal, provideYanivEditor } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import {
  installBrowserStubs,
  installLayoutStubs,
  waitForLocaleMessages,
} from "@/testing/mountEditor";

import LinkBubbleMenu from "./LinkBubbleMenu.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

let editor: Editor | null = null;
let wrapper: VueWrapper | null = null;
let portal: HTMLElement;

async function mountMenu(content: string): Promise<Editor> {
  const host = document.createElement("div");
  document.body.append(host);
  editor = new Editor({
    element: host,
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false })],
    content,
  });

  const editorRef = shallowRef<Editor | null>(editor);
  let localeCtx: { messages: { value: unknown } } | null = null;

  const Host = defineComponent({
    setup() {
      const root = document.createElement("div");
      root.className = EDITOR_ROOT_CLASS;
      portal = document.createElement("div");
      portal.className = OVERLAY_PORTAL_CLASS;
      root.append(portal);
      document.body.append(root);

      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));
      provideYanivEditor(editorRef);
      localeCtx = provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () => h(LinkBubbleMenu);
    },
  });

  wrapper = mount(Host, {
    attachTo: document.body,
    global: { stubs: { BubbleMenu: { template: "<div><slot /></div>" } } },
  });
  await waitForLocaleMessages(localeCtx!);
  return editor;
}

/** 组件的动作没有 expose，从渲染出的按钮上按 title 找 */
function actionButton(title: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>(".link-action-btn")].find(
    (button) => button.getAttribute("title") === title,
  );
  if (!found) throw new Error(`没有找到「${title}」按钮`);
  return found;
}

async function setModalUrl(value: string): Promise<void> {
  const input = document.querySelector<HTMLInputElement>(".ant-input");
  if (!input) throw new Error("弹窗没有渲染出输入框");
  input.value = value;
  input.dispatchEvent(new Event("input"));
  await nextTick();
}

function modalOpen(): boolean {
  // antd 关闭弹窗是 `display: none`，节点还留在文档里——只判「存在」会恒真。
  // ⚠️ 关闭还带过渡动画，`display` 不是同一拍就设上的，所以这个判据只适合
  // 断言「开着」，不适合断言「已经关了」——后者用输入框是否被清空来判。
  const wrap = document.querySelector<HTMLElement>(".ant-modal-wrap");
  return Boolean(wrap) && wrap!.style.display !== "none";
}

/** 关弹窗时会一并清空输入；这是「关没关」在同一拍里可观察的信号 */
function modalInputValue(): string {
  return document.querySelector<HTMLInputElement>(".ant-input")?.value ?? "";
}

async function confirmModal(): Promise<void> {
  // 按文案找会依赖 antd 自己的语言包（默认是 "OK" 而不是「确定」），按角色找才稳
  const ok = document.querySelector<HTMLElement>(".ant-modal-footer .ant-btn-primary");
  if (!ok) throw new Error("弹窗没有确定按钮");
  ok.click();
  await nextTick();
  await nextTick();
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  editor?.destroy();
  editor = null;
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("移除链接", () => {
  it("摘掉链接但保留文字", async () => {
    const target = await mountMenu('<p><a href="https://old.example.com">旧链接</a></p>');
    target.commands.setTextSelection({ from: 1, to: 4 });

    actionButton("移除链接").click();
    await nextTick();

    expect(target.getHTML()).not.toContain("<a");
    expect(target.getHTML()).toContain("旧链接");
  });
});

describe("打开链接", () => {
  it("安全地址交给 window.open，并带上 noopener", async () => {
    const target = await mountMenu('<p><a href="https://safe.example.com">链接</a></p>');
    target.commands.setTextSelection({ from: 1, to: 3 });
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    actionButton("打开链接").click();

    expect(open).toHaveBeenCalledWith("https://safe.example.com/", "_blank", "noopener,noreferrer");
  });

  it("危险协议不打开（href 可能是宿主直接注入的）", async () => {
    const target = await mountMenu("<p>文字</p>");
    // 绕开输入校验，直接把危险 href 塞进文档——模拟宿主注入的 JSON
    target.commands.setTextSelection({ from: 1, to: 3 });
    target.commands.setMark("link", { href: "javascript:alert(1)" });
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    actionButton("打开链接").click();

    expect(open).not.toHaveBeenCalled();
  });

  it("光标不在链接上时什么也不做", async () => {
    const target = await mountMenu("<p>纯文字</p>");
    target.commands.setTextSelection({ from: 1, to: 3 });
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    actionButton("打开链接").click();

    expect(open).not.toHaveBeenCalled();
  });
});

describe("编辑链接", () => {
  it("弹窗带出当前地址，改完写回文档并关闭", async () => {
    const target = await mountMenu('<p><a href="https://old.example.com">旧链接</a></p>');
    target.commands.setTextSelection({ from: 1, to: 4 });

    actionButton("编辑链接").click();
    await nextTick();
    expect(modalOpen()).toBe(true);

    await setModalUrl("https://new.example.com");
    await confirmModal();

    expect(target.getHTML()).toContain("https://new.example.com");
    expect(target.getHTML(), "整条链接要一起改，不能被劈开").not.toContain("old.example.com");
    expect(target.getHTML().match(/<a /g) ?? []).toHaveLength(1);
    expect(modalInputValue(), "成功之后弹窗关闭、输入清空").toBe("");
  });

  it("写回的链接带 rel=noopener（与工具栏那条入口同一份实现）", async () => {
    const target = await mountMenu('<p><a href="https://old.example.com">旧链接</a></p>');
    target.commands.setTextSelection({ from: 1, to: 4 });

    actionButton("编辑链接").click();
    await nextTick();
    await setModalUrl("https://new.example.com");
    await confirmModal();

    expect(target.getHTML()).toContain('rel="noopener noreferrer"');
  });

  it("非法地址：给出提示、保留弹窗、文档不变", async () => {
    const target = await mountMenu('<p><a href="https://old.example.com">旧链接</a></p>');
    target.commands.setTextSelection({ from: 1, to: 4 });
    const before = target.getHTML();

    actionButton("编辑链接").click();
    await nextTick();
    await setModalUrl("javascript:alert(1)");
    await confirmModal();

    expect(portal.textContent, "静默失败等于什么也没告诉用户").toContain("请输入有效的链接地址");
    expect(target.getHTML()).toBe(before);
    expect(modalOpen(), "弹窗要留着，让用户改").toBe(true);
    expect(modalInputValue(), "用户输的内容要留着，别让他重打一遍").toBe("javascript:alert(1)");
  });

  it("清空地址等于移除链接", async () => {
    const target = await mountMenu('<p><a href="https://old.example.com">旧链接</a></p>');
    target.commands.setTextSelection({ from: 1, to: 4 });

    actionButton("编辑链接").click();
    await nextTick();
    await setModalUrl("   ");
    await confirmModal();

    expect(target.getHTML()).not.toContain("<a");
    expect(target.getHTML()).toContain("旧链接");
  });
});
