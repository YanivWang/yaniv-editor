// @vitest-environment jsdom

/**
 * DragHandle 的块菜单、块转换与拖拽生命周期。
 *
 * **为什么这些能在 jsdom 里测。** 这个扩展里真正依赖浏览器的只有「指针落在哪个块上」
 * 这一步（`posAtCoords` / `elementFromPoint` / `getBoundingClientRect`），jsdom 里
 * 要么不存在要么恒为 0。这里把 `view.posAtCoords` 换成确定输入，断言的是扩展**自己的
 * 产出**——命中了哪个节点、菜单渲染成什么、转换后的文档长什么样、销毁时收回了什么，
 * 都与布局无关。真实几何（gutter 命中、hover 显隐、拖放落点）由
 * `e2e/drag-handle.spec.ts` 在真实 Chromium 里验收，两者不重叠。
 *
 * ⚠️ 断言里的末尾 `<p></p>` 是 StarterKit 自带的 `trailingNode`（文档最后一个块不是
 * 段落时自动补一个），不是本扩展的产物——实测确认，别当成缺陷。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import { Callout } from "../callout/CalloutExtension";
import { ToggleBlock } from "../toggle/ToggleExtension";

import { DragHandleExtension } from "./DragHandleExtension";

import type { DragInsertMenuContext, DragHandleOptions } from "./DragHandleExtension";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

const editors: Editor[] = [];

interface Harness {
  editor: Editor;
  portal: HTMLElement;
  handle: HTMLElement;
  plusButton: HTMLElement;
  menu: HTMLElement;
  /** 把指针停在 `pos` 所在的块上（替代真实几何命中），让 currentTarget 落位 */
  hover: (pos: number) => void;
  /** 只改「指针下方是哪个块」，不移动指针 */
  setPointerPos: (pos: number) => void;
  /** 把指针移到某个元素上（mousemove 只挂在 document 上） */
  movePointerTo: (target: EventTarget | null) => void;
  /** 打开块菜单并按 `data-item-id` 点一项 */
  runMenuItem: (itemId: string) => void;
  itemIds: () => string[];
}

function createHarness(content: string, options: DragHandleOptions = {}): Harness {
  const root = document.createElement("div");
  root.className = "yaniv-editor";
  const portal = document.createElement("div");
  portal.className = "yaniv-editor__overlay-portal";
  const host = document.createElement("div");
  root.append(portal, host);
  document.body.append(root);

  const editor = new Editor({
    element: host,
    extensions: [
      StarterKit,
      ToggleBlock,
      Callout,
      DragHandleExtension.configure({ getMenuLabel: (key) => key, ...options }),
    ],
    content,
  });
  editors.push(editor);

  const handleRoot = editor.view.dom.parentElement!;
  const handle = handleRoot.querySelector<HTMLElement>(".drag-handle")!;
  const plusButton = handleRoot.querySelector<HTMLElement>(".drag-handle-plus")!;
  const menu = portal.querySelector<HTMLElement>(".drag-handle-menu")!;

  const setPointerPos = (pos: number) => {
    (editor.view as unknown as { posAtCoords: unknown }).posAtCoords = () => ({
      pos,
      inside: -1,
    });
  };

  const movePointerTo = (target: EventTarget | null) => {
    const event = new MouseEvent("mousemove", { clientX: 5, clientY: 5, bubbles: true });
    Object.defineProperty(event, "target", { value: target });
    document.dispatchEvent(event);
  };

  const hover = (pos: number) => {
    setPointerPos(pos);
    movePointerTo(editor.view.dom.firstElementChild);
  };

  const itemIds = () =>
    [...menu.querySelectorAll<HTMLElement>(".drag-handle-menu__item")].map(
      (item) => item.dataset.itemId ?? "",
    );

  const runMenuItem = (itemId: string) => {
    if (!menu.classList.contains("is-visible")) handle.click();
    menu.querySelector<HTMLElement>(`[data-item-id="${itemId}"]`)!.click();
  };

  return {
    editor,
    portal,
    handle,
    plusButton,
    menu,
    hover,
    runMenuItem,
    itemIds,
    setPointerPos,
    movePointerTo,
  };
}

/** jsdom 没有 DataTransfer，用最小替身驱动真实的 dragstart 处理器 */
function fireDragStart(handle: HTMLElement): Record<string, string> {
  const data: Record<string, string> = {};
  const dataTransfer = {
    clearData: () => {},
    setData: (format: string, value: string) => {
      data[format] = value;
    },
    setDragImage: () => {},
    effectAllowed: "",
  } as unknown as DataTransfer;

  const event = new Event("dragstart", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  handle.dispatchEvent(event);
  return data;
}

function countDragImages(): number {
  return document.querySelectorAll(".drag-handle__drag-image").length;
}

/**
 * document 上的监听账本。
 *
 * 「销毁后监听还在不在」不能靠 `expect(dispatch).not.toThrow()` 判——jsdom 里事件
 * 处理器抛出的错**不冒泡到 `dispatchEvent` 的调用点**，那样写恒真（方法论 13）。
 * 只能直接记账。实测基线：建一个编辑器净增 selectionchange / mousemove / mousedown /
 * keydown 各 1，销毁后全部归零。
 */
function trackDocumentListeners() {
  const live = new Map<string, Set<unknown>>();
  const originalAdd = document.addEventListener.bind(document);
  const originalRemove = document.removeEventListener.bind(document);

  document.addEventListener = ((type: string, fn: unknown, options: unknown) => {
    if (!live.has(type)) live.set(type, new Set());
    live.get(type)!.add(fn);
    return originalAdd(type, fn as EventListener, options as never);
  }) as typeof document.addEventListener;

  document.removeEventListener = ((type: string, fn: unknown, options: unknown) => {
    live.get(type)?.delete(fn);
    return originalRemove(type, fn as EventListener, options as never);
  }) as typeof document.removeEventListener;

  return {
    count: (type: string) => live.get(type)?.size ?? 0,
    restore: () => {
      document.addEventListener = originalAdd;
      document.removeEventListener = originalRemove;
    },
  };
}

afterEach(() => {
  while (editors.length) {
    const editor = editors.pop();
    if (editor && !editor.isDestroyed) editor.destroy();
  }
  document.body.innerHTML = "";
});

describe("块转换：内容必须原样搬过去", () => {
  it("转成标题保留 mark 与链接的 href", () => {
    const h = createHarness(
      '<p>普通<strong>加粗</strong><a href="https://example.com">链接</a></p>',
    );
    h.hover(2);
    h.runMenuItem("heading1");

    const html = h.editor.getHTML();
    expect(html).toContain("<h1>");
    expect(html).toContain("<strong>加粗</strong>");
    expect(html).toContain('href="https://example.com"');
  });

  it("转成正文保留斜体", () => {
    const h = createHarness("<h2><em>斜体</em>标题</h2>");
    h.hover(2);
    h.runMenuItem("paragraph");

    expect(h.editor.getHTML()).toBe("<p><em>斜体</em>标题</p>");
  });

  it("转成引用保留段落里的换行节点", () => {
    const h = createHarness("<p>上<br>下</p>");
    h.hover(2);
    h.runMenuItem("blockquote");

    expect(h.editor.getHTML()).toContain("<blockquote><p>上<br>下</p></blockquote>");
  });

  it("多块源逐块产出，不把各块文字粘成一段", () => {
    const h = createHarness("<ul><li><p>甲</p></li><li><p>乙</p></li></ul>");
    h.hover(4);
    h.runMenuItem("paragraph");

    expect(h.editor.getHTML()).toBe("<p>甲</p><p>乙</p>");
  });

  it("多块源转标题时每块各得一个标题", () => {
    const h = createHarness("<ul><li><p>甲</p></li><li><p>乙</p></li></ul>");
    h.hover(4);
    h.runMenuItem("heading2");

    expect(h.editor.getHTML()).toContain("<h2>甲</h2><h2>乙</h2>");
  });

  it("正文转列表时保留 mark", () => {
    const h = createHarness("<p>要<strong>点</strong></p>");
    h.hover(2);
    h.runMenuItem("bulletList");

    expect(h.editor.getHTML()).toContain("<ul><li><p>要<strong>点</strong></p></li></ul>");
  });

  it("toggle 与 callout 都按块级容器构造并保留 mark", () => {
    const toggle = createHarness("<p>折<strong>叠</strong></p>");
    toggle.hover(2);
    toggle.runMenuItem("toggleBlock");
    expect(toggle.editor.getHTML()).toContain('data-type="toggle"');
    expect(toggle.editor.getHTML()).toContain("<strong>叠</strong>");

    const callout = createHarness("<p>提<em>示</em></p>");
    callout.hover(2);
    callout.runMenuItem("callout");
    expect(callout.editor.getHTML()).toContain('data-type="callout"');
    expect(callout.editor.getHTML()).toContain("<em>示</em>");
  });

  it("多行代码块转正文时换行用 hardBreak 表达，getHTML→setContent 往返无损", () => {
    const h = createHarness("<pre><code>甲\n乙\n丙</code></pre>");
    h.hover(2);
    h.runMenuItem("paragraph");

    const html = h.editor.getHTML();
    expect(html).toBe("<p>甲<br>乙<br>丙</p>");

    // 字面 `\n` 会在 HTML 解析时被折叠成空格；hardBreak 才是往返稳定的表达
    h.editor.commands.setContent(html);
    expect(h.editor.getHTML()).toBe(html);
    expect(h.editor.state.doc.textContent).not.toContain(" ");
  });

  it("转成代码块时剥掉 mark（schema 只收纯文本）并把换行还原成 \\n", () => {
    const h = createHarness("<p>上<strong>粗</strong><br>下</p>");
    h.hover(2);
    h.runMenuItem("codeBlock");

    expect(h.editor.getHTML()).toContain("<pre><code>上粗\n下</code></pre>");
  });

  it("没有行内内容的块（分割线）转正文得到一个空段落", () => {
    const h = createHarness("<hr><p>后</p>");
    h.hover(0);
    h.runMenuItem("paragraph");

    expect(h.editor.getHTML()).toBe("<p></p><p>后</p>");
  });
});

describe("块菜单：结构、目标与开合", () => {
  it("hover 后手柄与 + 号可见，菜单按 locale key 取文案", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);

    expect(h.handle.classList.contains("is-visible")).toBe(true);
    expect(h.plusButton.classList.contains("is-visible")).toBe(true);
    expect(h.handle.getAttribute("aria-label")).toBe("editor.dragHandleOpenMenu");
    expect(h.plusButton.getAttribute("aria-label")).toBe("editor.dragHandleAddBlock");

    h.handle.click();
    expect(h.itemIds()).toEqual([
      "duplicate",
      "delete",
      "turnInto",
      "paragraph",
      "heading1",
      "heading2",
      "heading3",
      "blockquote",
      "bulletList",
      "orderedList",
      "codeBlock",
      "toggleBlock",
      "callout",
    ]);
    expect(
      h.menu.querySelector('[data-item-id="duplicate"] .drag-handle-menu__label')?.textContent,
    ).toBe("dragMenu.duplicateBlock");
    expect(h.menu.querySelector('[data-item-id="delete"]')?.classList.contains("is-danger")).toBe(
      true,
    );
    // 「转换为」是有子菜单的容器，本身不可点，只能是非 button
    expect(h.menu.querySelector('[data-item-id="turnInto"]')?.tagName).toBe("DIV");
    expect(h.menu.querySelector('[data-item-id="paragraph"]')?.tagName).toBe("BUTTON");
  });

  it("指针落在块与块的边界上时回退到相邻块", () => {
    // pos 6 是文档末尾，$pos.depth 为 0、没有任何候选块，只能靠 nodeBefore 兜住
    const h = createHarness("<p>甲</p><p>乙</p>");
    h.hover(6);
    h.runMenuItem("delete");

    expect(h.editor.getHTML()).toBe("<p>甲</p>");
  });

  it("菜单挂在 overlay portal 内而不是 body 上", () => {
    const h = createHarness("<p>甲</p>");
    expect(h.menu.parentElement?.classList.contains("yaniv-editor__overlay-portal")).toBe(true);
  });

  it("删除的是命中的那个块", () => {
    const h = createHarness("<p>甲</p><p>乙</p><p>丙</p>");
    h.hover(4); // 第二段内部（段落各占 3：pos 0 / 3 / 6）
    h.runMenuItem("delete");

    expect(h.editor.getHTML()).toBe("<p>甲</p><p>丙</p>");
  });

  it("创建副本插在原块之后、光标落进副本，并保留 mark", () => {
    const h = createHarness("<p>甲</p><p>乙<strong>丙</strong></p><p>丁</p>");
    h.hover(4); // 第二段，pos 3、nodeSize 4

    h.runMenuItem("duplicate");

    expect(h.editor.getHTML()).toBe(
      "<p>甲</p><p>乙<strong>丙</strong></p><p>乙<strong>丙</strong></p><p>丁</p>",
    );
    /**
     * 副本与原块内容相同，插在原块**之前**得到的 HTML 一模一样——只断言 HTML 是恒真的。
     * 能区分两者的是光标：插在 pos 7（原块之后）时选区落进新副本，插在 pos 3 时落在 4。
     */
    expect(h.editor.state.selection.from).toBe(8);
  });

  it("再点一次手柄收起菜单", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);

    h.handle.click();
    expect(h.menu.classList.contains("is-visible")).toBe(true);

    h.handle.click();
    expect(h.menu.classList.contains("is-visible")).toBe(false);
    expect(h.menu.childElementCount).toBe(0);
  });

  it("Enter / 空格键也能打开菜单（手柄是 role=button）", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);

    expect(h.handle.getAttribute("role")).toBe("button");
    expect(h.handle.getAttribute("tabindex")).toBe("0");

    h.handle.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(h.menu.classList.contains("is-visible")).toBe(true);
  });

  it("Escape 关闭菜单并收起手柄", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);
    h.handle.click();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(h.menu.classList.contains("is-visible")).toBe(false);
    expect(h.handle.classList.contains("is-visible")).toBe(false);
  });

  it("点编辑器外部关闭菜单，点菜单自身不关", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);
    h.handle.click();

    const inside = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(inside, "target", { value: h.menu });
    document.dispatchEvent(inside);
    expect(h.menu.classList.contains("is-visible")).toBe(true);

    const outside = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(outside, "target", { value: document.body });
    document.dispatchEvent(outside);
    expect(h.menu.classList.contains("is-visible")).toBe(false);
  });

  it("指针移到菜单上时不重新做块命中，菜单保持打开", () => {
    const h = createHarness("<p>甲</p><p>乙</p>");
    h.hover(2);
    h.handle.click();
    expect(h.menu.classList.contains("is-visible")).toBe(true);

    /**
     * 块菜单比触发它的块高得多（真实浏览器实测段落 26px、菜单 139px），
     * 指针从手柄移向菜单项时，按指针 Y 去探内容会命中菜单下方的块——
     * 这里用 `setPointerPos` 模拟那一刻，菜单不得被关掉。
     */
    h.setPointerPos(6);
    h.movePointerTo(h.menu.querySelector('[data-item-id="turnInto"]'));

    expect(h.menu.classList.contains("is-visible")).toBe(true);
    expect(h.itemIds()).toContain("turnInto");
  });

  it("指针移到块选择器上时不关闭插入菜单", () => {
    const picker = document.createElement("div");
    picker.className = "block-picker-menu";
    document.body.append(picker);

    let closed = 0;
    const h = createHarness("<p>甲</p><p>乙</p>", {
      onOpenInsertMenu: () => {},
      onCloseInsertMenu: () => (closed += 1),
    });
    h.hover(2);
    h.plusButton.click();
    expect(h.editor.storage.dragHandle.insertMenuOpen).toBe(true);

    // 块选择器由 BlockPickerMenu 渲染在 overlay portal 里，同样属于「自己的浮层」
    h.setPointerPos(6);
    h.movePointerTo(picker);

    expect(h.editor.storage.dragHandle.insertMenuOpen).toBe(true);
    expect(closed).toBe(0);
  });

  it("只读时不出手柄，且已开的菜单被收掉", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);
    h.handle.click();
    expect(h.menu.classList.contains("is-visible")).toBe(true);

    h.editor.setEditable(false);

    expect(h.menu.classList.contains("is-visible")).toBe(false);
    expect(h.handle.classList.contains("is-visible")).toBe(false);

    h.hover(2);
    expect(h.handle.classList.contains("is-visible")).toBe(false);
  });
});

describe("+ 号的插入菜单通知", () => {
  it("交出目标块的位置与插入点", () => {
    const contexts: DragInsertMenuContext[] = [];
    const h = createHarness("<p>甲</p><p>乙</p>", {
      onOpenInsertMenu: (context) => contexts.push(context),
    });
    h.hover(4); // 第二段内部：pos 3，nodeSize 3

    h.plusButton.click();

    expect(contexts).toHaveLength(1);
    expect(contexts[0].targetPos).toBe(3);
    expect(contexts[0].targetNodeSize).toBe(3);
    expect(contexts[0].insertPos).toBe(6);
    expect(h.editor.storage.dragHandle.insertMenuOpen).toBe(true);
  });

  it("再点一次关闭，并通知宿主", () => {
    let closed = 0;
    const h = createHarness("<p>甲</p>", {
      onOpenInsertMenu: () => {},
      onCloseInsertMenu: () => (closed += 1),
    });
    h.hover(2);

    h.plusButton.click();
    h.plusButton.click();

    expect(closed).toBe(1);
    expect(h.editor.storage.dragHandle.insertMenuOpen).toBe(false);
  });

  it("宿主没接 onOpenInsertMenu 时不置位（否则状态再也回不去）", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);

    h.plusButton.click();

    expect(h.editor.storage.dragHandle.insertMenuOpen).toBe(false);
  });
});

describe("拖拽生命周期与资源收回", () => {
  it("dragstart 建立 NodeSelection、写好两种剪贴板格式并置位 storage", () => {
    const h = createHarness("<p>甲<strong>乙</strong></p><p>丙</p>");
    h.hover(2);

    const data = fireDragStart(h.handle);

    expect(h.editor.state.selection.constructor.name).toBe("NodeSelection");
    expect(data["text/html"]).toBe("<p>甲<strong>乙</strong></p>");
    expect(data["text/plain"]).toBe("甲乙");
    expect(h.editor.storage.dragHandle.isDragging).toBe(true);
    expect(h.handle.classList.contains("is-dragging")).toBe(true);
    expect(h.editor.view.dragging).not.toBeNull();
    expect(countDragImages()).toBe(1);
  });

  it("dragend 收回影像并复位 storage", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);
    fireDragStart(h.handle);

    h.handle.dispatchEvent(new Event("dragend", { bubbles: true }));

    expect(countDragImages()).toBe(0);
    expect(h.editor.storage.dragHandle.isDragging).toBe(false);
    expect(h.handle.classList.contains("is-dragging")).toBe(false);
  });

  it("拖拽途中被销毁时也要收回影像（它挂在 body，不随编辑器消失）", () => {
    const h = createHarness("<p>甲</p>");
    h.hover(2);
    fireDragStart(h.handle);
    expect(countDragImages()).toBe(1);

    h.editor.destroy();

    expect(countDragImages()).toBe(0);
  });

  it("一个实例的 dragend 不得清掉另一个实例的影像", () => {
    const a = createHarness("<p>甲</p>");
    a.hover(2);
    fireDragStart(a.handle);

    const b = createHarness("<p>乙</p>");
    b.hover(2);
    fireDragStart(b.handle);
    expect(countDragImages()).toBe(2);

    b.handle.dispatchEvent(new Event("dragend", { bubbles: true }));

    expect(countDragImages()).toBe(1);
  });

  it("销毁时摘掉全部 document 级监听与自建 DOM", () => {
    const tracker = trackDocumentListeners();
    try {
      const h = createHarness("<p>甲</p>");
      h.hover(2);
      h.handle.click();

      expect(tracker.count("mousemove")).toBe(1);
      expect(tracker.count("mousedown")).toBe(1);
      expect(tracker.count("keydown")).toBe(1);

      h.editor.destroy();

      expect(tracker.count("mousemove")).toBe(0);
      expect(tracker.count("mousedown")).toBe(0);
      expect(tracker.count("keydown")).toBe(0);

      expect(document.querySelector(".drag-handle")).toBeNull();
      expect(document.querySelector(".drag-handle-plus")).toBeNull();
      expect(document.querySelector(".drag-handle-menu")).toBeNull();
    } finally {
      tracker.restore();
    }
  });
});
