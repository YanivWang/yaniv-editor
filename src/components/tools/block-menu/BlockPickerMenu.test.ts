import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, h, nextTick, provide, ref } from "vue";

import { editorAppearanceInjectionKey } from "@/appearance";
import type { ResolvedColorMode } from "@/appearance";
import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";
import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import type { MediaUploadHandler } from "@/core/editorTypes";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import type { BlockMenuInstance } from "@/core/shell/useBlockMenuHost";
import YanivEditor from "@/core/YanivEditor.vue";
import { Callout } from "@/extensions/callout";
import { Column, ColumnLayout } from "@/extensions/column";
import { DragHandleExtension } from "@/extensions/dragHandle";
import { Embed } from "@/extensions/embed";
import { Mention } from "@/extensions/mention";
import { ResizableImage } from "@/extensions/resizableImage";
import { SlashCommandExtension, slashCommandKey } from "@/extensions/slashCommand";
import { ToggleBlock } from "@/extensions/toggle";
import { Video } from "@/extensions/video";
import {
  installBrowserStubs,
  installLayoutStubs,
  mountEditor,
  unmountAll,
  waitForLocaleMessages,
} from "@/testing/mountEditor";

import { BlockPickerMenu } from "./index";

import type { BlockInsertContext } from "./types";
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

/* ────────────────────────────────────────────────────────────────────────────
 * 直挂式脚手架（第 17 棒新增）
 *
 * 上面那组挂的是完整编辑器，验的是「斜杠命令这条链路真的通」。这一组直接挂
 * `BlockPickerMenu` 本体，验的是**选中一项之后到底发生了什么**：过滤、键盘导航、
 * 两种模式各自把内容写到哪个位置。这些都与布局无关（判据见 `vitest.config.ts`：
 * 「这段逻辑要不要布局」），而完整挂载既慢，也拿不到 `uploadImage` / `uploadVideo`
 * 这两个由宿主透传的 prop。
 *
 * 斜杠命令仍然走扩展的真实回调（`onActivate` / `onQueryChange` / `onDeactivate`），
 * 与 `capabilities/registry.ts` 里的接线一致，不手工调 `activate()`。
 * ──────────────────────────────────────────────────────────────────────────── */

interface DirectHarness {
  editor: Editor;
  portal: HTMLElement;
  menu: BlockMenuInstance & { isVisible: boolean };
  /** 在段首输入 `/`，触发斜杠命令并等菜单渲染 */
  typeSlash: () => Promise<void>;
  /** 当前菜单里的条目标题（按扁平顺序） */
  titles: () => string[];
  /** 当前 `aria-selected="true"` 的那一项 */
  selectedTitle: () => string | null;
  clickItem: (title: string) => Promise<void>;
  hoverItem: (title: string) => Promise<void>;
  press: (key: string) => Promise<void>;
  /** `pickMediaUrl` 注入文档的隐藏 `<input type=file>` */
  fileInput: () => HTMLInputElement | null;
}

const directEditors: Editor[] = [];
const directWrappers: VueWrapper[] = [];

afterEach(() => {
  while (directWrappers.length) directWrappers.pop()?.unmount();
  while (directEditors.length) directEditors.pop()?.destroy();
  document.body.innerHTML = "";
  // `vi.spyOn` 对已经被 spy 的属性会**复用同一个 mock**，调用记录跟着跨用例累积：
  // 不还原的话，下一条用例里的 `toHaveBeenCalledTimes(1)` 会莫名其妙地读成 2。
  vi.restoreAllMocks();
});

async function createDirectHarness(
  options: {
    content?: string;
    uploadImage?: MediaUploadHandler;
    uploadVideo?: MediaUploadHandler;
    withDragHandle?: boolean;
  } = {},
): Promise<DirectHarness> {
  const root = document.createElement("div");
  root.className = EDITOR_ROOT_CLASS;
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  const host = document.createElement("div");
  root.append(portal, host);
  document.body.append(root);

  const menuRef = ref<(BlockMenuInstance & { isVisible: boolean }) | null>(null);

  const editor = new Editor({
    element: host,
    extensions: [
      StarterKit,
      ToggleBlock,
      Callout,
      ColumnLayout,
      Column,
      Embed,
      Mention,
      ResizableImage,
      Video,
      ...(options.withDragHandle
        ? [DragHandleExtension.configure({ getMenuLabel: (key: string) => key })]
        : []),
      SlashCommandExtension.configure({
        onActivate: (state) => menuRef.value?.activate(state),
        onDeactivate: () => menuRef.value?.hide(),
        onQueryChange: (query) => menuRef.value?.updateQuery(query),
      }),
    ],
    content: options.content ?? "<p>正文</p><p></p>",
  });
  directEditors.push(editor);

  let localeCtx: { messages: { value: unknown } } | null = null;
  const Host = defineComponent({
    setup() {
      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));
      provide(editorAppearanceInjectionKey, {
        appearance: ref<EditorAppearance>("notion"),
        colorMode: ref<EditorColorMode>("light"),
        resolvedMode: computed<ResolvedColorMode>(() => "light"),
      });
      localeCtx = provideEditorLocale(ref("zh-CN"));
      return () =>
        h(BlockPickerMenu, {
          ref: menuRef,
          editor,
          features: { table: false, image: true, video: true, math: false },
          uploadImage: options.uploadImage,
          uploadVideo: options.uploadVideo,
        });
    },
  });

  directWrappers.push(mount(Host, { attachTo: root }));
  await waitForLocaleMessages(localeCtx!);

  const items = () => [...portal.querySelectorAll<HTMLElement>(".block-picker-item")];
  const titleOf = (el: Element) =>
    (el.querySelector(".block-picker-item-title")?.textContent ?? "").trim();
  // 「替换 / 全部替换」那类子串误伤在这里同样存在（如「标题 1」是「标题 10」的前缀），
  // 因此一律精确比较去空白后的文本，找不到就把现有条目打出来
  const findItem = (title: string) => {
    const hit = items().find((el) => titleOf(el) === title);
    if (!hit)
      throw new Error(`菜单里没有「${title}」，当前条目：${items().map(titleOf).join(" / ")}`);
    return hit;
  };

  return {
    editor,
    portal,
    menu: menuRef.value!,
    async typeSlash() {
      editor.commands.focus("end");
      editor.commands.insertContent("/");
      await nextTick();
      await nextTick();
    },
    titles: () => items().map(titleOf),
    selectedTitle: () => {
      const active = portal.querySelector('.block-picker-item[aria-selected="true"]');
      return active ? titleOf(active) : null;
    },
    async clickItem(title: string) {
      findItem(title).click();
      await nextTick();
    },
    async hoverItem(title: string) {
      findItem(title).dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
      await nextTick();
    },
    async press(key: string) {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
      await nextTick();
    },
    fileInput: () => document.body.querySelector<HTMLInputElement>('input[type="file"]'),
  };
}

/** 文档顶层的块类型序列——比 HTML 更能看清「插到了哪一块之前」 */
function childTypes(editor: Editor): string[] {
  const types: string[] = [];
  editor.state.doc.forEach((node) => types.push(node.type.name));
  return types;
}

/** 造一份 + 号菜单的插入上下文（几何值不参与断言，只喂给定位函数） */
function insertContextAt(insertPos: number): BlockInsertContext {
  return {
    targetPos: insertPos,
    targetNodeSize: 2,
    insertPos,
    anchorRect: new DOMRect(10, 40, 20, 20),
    blockRect: new DOMRect(30, 40, 200, 26),
  };
}

describe("块菜单：查询过滤", () => {
  it("按标题过滤，命中为空的分组整组消失", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();
    expect(h.titles()).toContain("无序列表");

    h.menu.updateQuery("标题");
    await nextTick();

    expect(h.titles()).toEqual(["标题 1", "标题 2", "标题 3"]);
    const groups = [...h.portal.querySelectorAll(".block-picker-group-title")].map((el) =>
      el.textContent?.trim(),
    );
    expect(groups).toEqual(["基础块"]);
  });

  it("标题不含关键字时也能按 keywords 命中", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();

    // 「任务列表」的标题里没有 todo，只有 keywords 里有
    h.menu.updateQuery("todo");
    await nextTick();

    expect(h.titles()).toEqual(["任务列表"]);
  });

  it("一条都不匹配时渲染空态而不是空列表", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();

    h.menu.updateQuery("zzz-不存在的块");
    await nextTick();

    expect(h.portal.querySelector(".block-picker-list")).toBeNull();
    expect(h.portal.querySelector(".block-picker-empty")?.textContent?.trim()).toBe("无匹配结果");
  });

  it("改查询把高亮拉回第一项", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();

    await h.press("ArrowDown");
    await h.press("ArrowDown");
    expect(h.selectedTitle()).toBe("标题 2");

    h.menu.updateQuery("列表");
    await nextTick();

    expect(h.selectedTitle()).toBe(h.titles()[0]);
  });
});

describe("块菜单：键盘与指针高亮", () => {
  it("上下键移动高亮并在两端回绕", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();
    const all = h.titles();
    expect(h.selectedTitle()).toBe(all[0]);

    await h.press("ArrowDown");
    expect(h.selectedTitle()).toBe(all[1]);

    await h.press("ArrowUp");
    await h.press("ArrowUp");
    expect(h.selectedTitle()).toBe(all[all.length - 1]);

    await h.press("ArrowDown");
    expect(h.selectedTitle()).toBe(all[0]);
  });

  it("鼠标移到某项上就把高亮交给它", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();

    await h.hoverItem("代码块");
    expect(h.selectedTitle()).toBe("代码块");
  });

  it("回车应用当前高亮项", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();

    await h.press("ArrowDown"); // 标题 1
    expect(h.selectedTitle()).toBe("标题 1");
    await h.press("Enter");
    await nextTick();

    expect(h.editor.getHTML()).toContain("<h1>");
    expect(h.menu.isVisible).toBe(false);
  });

  it("Esc 关闭菜单，且不改动文档", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();
    const before = h.editor.getHTML();

    await h.press("Escape");

    expect(h.menu.isVisible).toBe(false);
    expect(h.portal.querySelector(".block-picker-menu")).toBeNull();
    expect(h.editor.getHTML()).toBe(before);
  });

  it("菜单没开时按键不拦截；空结果时回车是安全空操作", async () => {
    const h = await createDirectHarness();
    const before = h.editor.getHTML();

    await h.press("ArrowDown");
    await h.press("Enter");
    expect(h.editor.getHTML()).toBe(before);

    await h.typeSlash();
    h.menu.updateQuery("zzz-不存在的块");
    await nextTick();
    await h.press("Enter");

    expect(h.menu.isVisible).toBe(true);
    expect(h.portal.querySelector(".block-picker-empty")).not.toBeNull();
  });
});

describe("块菜单：slash 模式选中一项", () => {
  it("先删掉 `/` 触发文本再做转换", async () => {
    const h = await createDirectHarness({ content: "<p>正文</p><p></p>" });
    h.editor.commands.setTextSelection(h.editor.state.doc.content.size - 1);
    await h.typeSlash();
    expect(h.editor.getText()).toContain("/");

    await h.clickItem("无序列表");

    const html = h.editor.getHTML();
    expect(html).toContain("<ul>");
    // 触发用的 `/` 不能留在正文里
    expect(h.editor.getText()).not.toContain("/");
    expect(h.menu.isVisible).toBe(false);
  });

  it("关闭时通知斜杠命令插件失活，避免菜单关了状态还开着", async () => {
    const h = await createDirectHarness();
    await h.typeSlash();
    expect((slashCommandKey.getState(h.editor.state) as { active: boolean }).active).toBe(true);

    h.menu.hide();
    await nextTick();

    expect((slashCommandKey.getState(h.editor.state) as { active: boolean }).active).toBe(false);
  });
});

describe("块菜单：+ 号插入模式", () => {
  it("打开时置起 dragHandle 的 insertMenuOpen，关闭时落下", async () => {
    const h = await createDirectHarness({ withDragHandle: true });
    const storage = h.editor.storage.dragHandle as { insertMenuOpen: boolean };
    expect(storage.insertMenuOpen).toBe(false);

    h.menu.openInsert(insertContextAt(0));
    await nextTick();
    expect(storage.insertMenuOpen).toBe(true);

    h.menu.hide();
    await nextTick();
    expect(storage.insertMenuOpen).toBe(false);
  });

  it("没有 dragHandle 扩展时照常打开菜单，不去碰不存在的 storage", async () => {
    const h = await createDirectHarness();
    expect(h.editor.storage.dragHandle).toBeUndefined();

    h.menu.openInsert(insertContextAt(0));
    await nextTick();

    expect(h.menu.isVisible).toBe(true);
    expect(h.portal.querySelector(".block-picker-menu")).not.toBeNull();
  });

  /**
   * 锁的是用户看得见的那条不变量：**关掉再打开，高亮回到第一项**。
   *
   * ⚠️ 它不指认是哪一行做的重置：变异实测 `hide()` 与 `openInsert()` 各去掉一处
   * 仍然全绿，两处都去掉才转红——两者互为兜底。这也是删掉原来那个
   * `watch(query)` 的依据：`query` 在这条路径上从空串写成空串，watcher 根本不响应。
   */
  it("重新打开时高亮回到第一项 —— query 前后都是空串，watcher 兜不住这一半", async () => {
    const h = await createDirectHarness();

    h.menu.openInsert(insertContextAt(0));
    await nextTick();
    await h.press("ArrowDown");
    await h.press("ArrowDown");
    expect(h.selectedTitle()).toBe(h.titles()[2]);

    h.menu.hide();
    await nextTick();
    h.menu.openInsert(insertContextAt(0));
    await nextTick();

    expect(h.selectedTitle()).toBe(h.titles()[0]);
  });

  it("插到 + 号记下的位置，而不是当前光标处", async () => {
    const h = await createDirectHarness({ content: "<p>第一段</p><p>第二段</p>" });
    // 光标停在第二段，+ 号点的却是第一段之前
    h.editor.commands.setTextSelection(h.editor.state.doc.content.size - 1);

    h.menu.openInsert(insertContextAt(0));
    await nextTick();
    await h.clickItem("引用");

    expect(h.editor.getHTML()).toMatch(/^<blockquote>/);
    expect(h.menu.isVisible).toBe(false);
  });
});

describe("块菜单：嵌入与媒体这类要等用户再输入一次的项", () => {
  it("slash 模式插入嵌入块：先删 `/`，URL 回来后插到原来的位置", async () => {
    const h = await createDirectHarness({ content: "<p>正文</p><p></p>" });

    /**
     * `window.prompt` 在真实浏览器里是**阻塞**的：这段时间里编辑器可能被重新聚焦、
     * 被宿主受控推送改写，选区未必还停在原处。把「选区被挪走」放进 prompt 里，
     * 才真的在问「插入用的是记下的位置还是实时选区」——放在 `await` 之后不算数，
     * 因为 `promptEmbedUrl` 交出的是已决议的 Promise，回调在那之前就跑完了。
     */
    const prompt = vi.spyOn(window, "prompt").mockImplementation(() => {
      h.editor.commands.setTextSelection(1);
      return "https://example.com/page";
    });

    await h.typeSlash();
    await h.clickItem("嵌入/书签");

    // 菜单先关、`/` 先删，之后才向用户要 URL
    expect(h.menu.isVisible).toBe(false);
    expect(prompt).toHaveBeenCalledTimes(1);
    await flushPromises();

    // 嵌入块落在第一段之后（即 `/` 所在的那一段），第一段内容原样不动。
    // 若改用插入时的实时选区，`正文` 会被从中间劈开——两条断言各挡一半。
    expect(childTypes(h.editor).slice(0, 2)).toEqual(["paragraph", "embed"]);
    expect(h.editor.state.doc.child(0).textContent).toBe("正文");
    expect(h.editor.getHTML()).toContain("https://example.com/page");
    expect(h.editor.getText()).not.toContain("/");
  });

  it("用户取消输入 URL 时只留下删掉 `/` 的结果", async () => {
    const h = await createDirectHarness();
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);

    await h.typeSlash();
    await h.clickItem("嵌入/书签");
    await flushPromises();

    // 先站住肯定的一半：确实走到了「向用户要 URL」这一步
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(childTypes(h.editor)).not.toContain("embed");
    expect(h.editor.state.doc.child(0).textContent).toBe("正文");
    expect(h.editor.getText()).not.toContain("/");
  });

  it("slash 模式插入图片：文件选完之后插到 `/` 原来的位置", async () => {
    const uploadImage = vi.fn().mockResolvedValue("https://cdn.example.com/a.png");
    const h = await createDirectHarness({ content: "<p>正文</p><p></p>", uploadImage });
    h.editor.commands.setTextSelection(h.editor.state.doc.content.size - 1);
    const slashPos = h.editor.state.selection.from;

    await h.typeSlash();
    await h.clickItem("图片");

    // 打开文件选择器之前就要收起菜单并删掉 `/`（否则失焦后斜杠命令会重新激活）
    expect(h.menu.isVisible).toBe(false);
    expect(h.editor.getText()).not.toContain("/");

    const input = h.fileInput();
    expect(input).not.toBeNull();

    // 期间用户点到了别处
    h.editor.commands.setTextSelection(1);

    const file = new File(["x"], "a.png", { type: "image/png" });
    Object.defineProperty(input!, "files", { value: [file] });
    input!.dispatchEvent(new Event("change"));
    await flushPromises();

    expect(uploadImage).toHaveBeenCalledWith(file);
    expect(h.editor.state.doc.resolve(slashPos).nodeAfter?.type.name).toBe("image");
    expect(h.editor.getHTML()).toContain("https://cdn.example.com/a.png");
  });

  it("+ 号模式取消文件选择时文档纹丝不动", async () => {
    const uploadVideo = vi.fn().mockResolvedValue("https://cdn.example.com/a.mp4");
    const h = await createDirectHarness({ content: "<p>正文</p>", uploadVideo });

    h.menu.openInsert(insertContextAt(0));
    await nextTick();
    const before = h.editor.getHTML();
    await h.clickItem("视频");

    const input = h.fileInput();
    expect(input).not.toBeNull();
    input!.dispatchEvent(new Event("cancel"));
    await flushPromises();

    expect(uploadVideo).not.toHaveBeenCalled();
    expect(h.editor.getHTML()).toBe(before);
    expect(document.body.querySelector('input[type="file"]')).toBeNull();
  });

  it("+ 号模式插入视频：用 + 号记下的位置", async () => {
    const uploadVideo = vi.fn().mockResolvedValue("https://cdn.example.com/a.mp4");
    const h = await createDirectHarness({ content: "<p>第一段</p><p>第二段</p>", uploadVideo });
    h.editor.commands.setTextSelection(h.editor.state.doc.content.size - 1);

    h.menu.openInsert(insertContextAt(0));
    await nextTick();
    await h.clickItem("视频");

    const input = h.fileInput()!;
    const file = new File(["x"], "a.mp4", { type: "video/mp4" });
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change"));
    await flushPromises();

    expect(h.editor.state.doc.resolve(0).nodeAfter?.type.name).toBe("video");
  });
});
