// @vitest-environment jsdom

/**
 * `showTaskList` 的默认值曾是 `false`，而编辑器内部三处用法全都显式传 `true`
 * ——默认值从未生效，只会让直接用 `ListTools` 的宿主拿到与编辑器不一致的表现。
 * 改成 `true` 后三处显式传参一并删掉，行为不变。
 */
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { installBrowserStubs } from "@/testing/mountEditor";

import ListTools from "./ListTools.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(installBrowserStubs);

const editors: Editor[] = [];
let wrapper: VueWrapper | null = null;

function mountTools(props: Record<string, unknown> = {}) {
  const root = document.createElement("div");
  root.className = EDITOR_ROOT_CLASS;
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  root.append(portal);
  const host = document.createElement("div");
  root.append(host);
  document.body.append(root);

  const editor = new Editor({
    element: host,
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true })],
    content: "<p></p>",
  });
  editors.push(editor);

  wrapper = mount(
    defineComponent({
      setup() {
        provideEditorRoot(ref(root));
        provideOverlayPortal(ref(portal));
        provideEditorLocale(ref("zh-CN"));
        return () => h(ListTools, { editor, ...props });
      },
    }),
    { attachTo: document.body },
  );
  return wrapper;
}

const buttonCount = (w: VueWrapper) => w.findAll("button").length;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

describe("ListTools 的 showTaskList", () => {
  it("默认显示任务列表按钮（与编辑器三处用法一致）", () => {
    const w = mountTools();
    expect(buttonCount(w)).toBe(3);
  });

  it("显式传 false 时只剩无序 / 有序两个按钮", () => {
    const w = mountTools({ showTaskList: false });
    expect(buttonCount(w)).toBe(2);
  });

  it("显式传 true 与默认一致", () => {
    const w = mountTools({ showTaskList: true });
    expect(buttonCount(w)).toBe(3);
  });
});
