// @vitest-environment jsdom

import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref, shallowRef } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import {
  countEditorListeners,
  countEditorListenersFor,
  installBrowserStubs,
} from "@/testing/mountEditor";

import UndoRedoButton from "./UndoRedoButton.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(installBrowserStubs);

const WATCHED_EVENTS = ["update", "selectionUpdate", "transaction"] as const;

/**
 * 组件自己挂的监听数：只有 `transaction`（同步可用性）= 1。
 *
 * 不能写成 `WATCHED_EVENTS.length`——那会把「组件订了哪些事件」和「测试观察哪些事件」
 * 绑成同一个数。`update` 与 `selectionUpdate` 都是 `transaction` 的严格子集
 * （不变量 37），组件不再订它们，但测试仍要把它们算进来，否则漏订回退时数不出来。
 */
const OWN_LISTENERS = 1;

const editors: Editor[] = [];
let wrapper: VueWrapper | null = null;

function createEditor(): Editor {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const editor = new Editor({ element: host, extensions: [StarterKit] });
  editors.push(editor);
  return editor;
}

function mountButton(current: { value: Editor | null }): VueWrapper {
  return mount(
    defineComponent({
      setup() {
        const root = document.createElement("div");
        root.className = EDITOR_ROOT_CLASS;
        const portal = document.createElement("div");
        portal.className = OVERLAY_PORTAL_CLASS;
        root.append(portal);
        document.body.append(root);

        provideEditorRoot(ref(root));
        provideOverlayPortal(ref(portal));
        provideEditorLocale(ref("zh-CN"));
        return () => h(UndoRedoButton, { editor: current.value });
      },
    }),
    { attachTo: document.body },
  );
}

/**
 * 制造一步可撤销的编辑。
 *
 * 不能带 `.focus()`：tiptap 的 focus 命令把 `view.focus()` 丢进 `requestAnimationFrame`，
 * 里面只守 `editor.isDestroyed`。测试收尾清空 `document.body` 后回调才跑，
 * view.dom 已脱离文档，抛出的错不冒泡到任何调用点，只会变成 vitest 的 "Unhandled Errors"
 * ——单跑这个文件看不见，跑全量才打穿 CI。撤销历史本来也不需要焦点。
 */
function makeEdit(editor: Editor): void {
  editor.chain().insertContent("用户敲的字").run();
}

/** 撤销按钮是工具栏里的第一个 button（第二个是重做） */
function undoButton(w: VueWrapper): HTMLButtonElement {
  const btn = w.element.querySelectorAll("button")[0];
  if (!btn) throw new Error("没找到撤销按钮");
  return btn as HTMLButtonElement;
}

/** 订阅曾被包在 nextTick 里，需要多让出一次事件循环才能观察到旧行为 */
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

describe("UndoRedoButton 的编辑器事件订阅", () => {
  it("每个事件只订阅一份", async () => {
    const editor = createEditor();
    const baseline = countEditorListenersFor(editor, WATCHED_EVENTS);

    wrapper = mountButton(shallowRef<Editor | null>(editor));
    await settle();

    // 曾经因为 `if (editor.value) setup()` 与 `{ immediate: true }` 各调一次、
    // 而清理又跑在 nextTick 订阅之前，导致每个事件挂了两份 handler
    expect(countEditorListenersFor(editor, WATCHED_EVENTS)).toBe(baseline + OWN_LISTENERS);
  });

  it("切换编辑器实例后，旧实例上的监听被摘干净", async () => {
    const first = createEditor();
    const second = createEditor();
    const firstBaseline = countEditorListenersFor(first, WATCHED_EVENTS);
    const secondBaseline = countEditorListenersFor(second, WATCHED_EVENTS);

    const current = shallowRef<Editor | null>(first);
    wrapper = mountButton(current);
    await settle();

    current.value = second;
    await settle();

    expect(countEditorListenersFor(first, WATCHED_EVENTS)).toBe(firstBaseline);
    expect(countEditorListenersFor(second, WATCHED_EVENTS)).toBe(secondBaseline + OWN_LISTENERS);
  });

  /**
   * `create` 在编辑器构造末尾就 emit 过了，组件拿到实例时早已错过——那个回调永远不会执行。
   * 它还是匿名函数，而退订写的是另一个引用，于是每换一次实例就多攒一个摘不掉的监听。
   */
  it("不订阅永远不会触发的 create 事件", async () => {
    const first = createEditor();
    const second = createEditor();
    const firstCreate = countEditorListeners(first, "create");

    const current = shallowRef<Editor | null>(first);
    wrapper = mountButton(current);
    await settle();

    for (const next of [second, first, second, first]) {
      current.value = next;
      await settle();
    }

    expect(countEditorListeners(first, "create")).toBe(firstCreate);
  });

  it("卸载后不留监听", async () => {
    const editor = createEditor();
    const baseline = countEditorListenersFor(editor, WATCHED_EVENTS);

    wrapper = mountButton(shallowRef<Editor | null>(editor));
    await settle();
    expect(countEditorListenersFor(editor, WATCHED_EVENTS)).toBeGreaterThan(baseline);

    wrapper.unmount();
    wrapper = null;
    expect(countEditorListenersFor(editor, WATCHED_EVENTS)).toBe(baseline);
  });
});

/**
 * 撤销可用性必须完全跟随编辑器的历史栈，不能受组件自身的挂载时机影响。
 *
 * 曾经组件里有个 `hasRealEdit` 标记：只有收到过 `update` 事件才允许撤销，
 * 本意是挡「初始化时的误判」。实测那个场景不存在——空文档、带 `content`、
 * 带多段内容三种建法下 `can().undo()` 初始都是 `false`。
 * 它挡住的反而是真场景：`mode` 在 edit / preview 之间往返会把整个编辑 chrome
 * 卸载重挂（`showEditChrome = mode === "edit"`，而 `sessionKey` 不含 `mode`，
 * 编辑器实例与历史都原样活着），重挂出来的按钮却因为标记归零而变灰，
 * 用户撤销不了自己刚写的东西，直到再随便改一个字。
 */
describe("撤销可用性只跟随编辑器历史", () => {
  it("挂载在已有撤销历史的编辑器上，按钮就是可点的", async () => {
    const editor = createEditor();
    makeEdit(editor);
    await settle();
    expect(editor.can().undo()).toBe(true);

    // 组件此刻才挂上来（等价于 chrome 重挂 / 异步组件迟到）
    wrapper = mountButton(shallowRef<Editor | null>(editor));
    await settle();

    expect(undoButton(wrapper).disabled).toBe(false);
  });

  it("卸载重挂后按钮不会变灰", async () => {
    const editor = createEditor();
    const current = shallowRef<Editor | null>(editor);

    wrapper = mountButton(current);
    await settle();
    makeEdit(editor);
    await settle();
    expect(undoButton(wrapper).disabled).toBe(false);

    wrapper.unmount();
    wrapper = mountButton(current);
    await settle();

    expect(editor.can().undo()).toBe(true);
    expect(undoButton(wrapper).disabled).toBe(false);
  });

  it("刚建好的编辑器上按钮是禁用的", async () => {
    const editor = createEditor();
    wrapper = mountButton(shallowRef<Editor | null>(editor));
    await settle();

    expect(editor.can().undo()).toBe(false);
    expect(undoButton(wrapper).disabled).toBe(true);
  });
});
