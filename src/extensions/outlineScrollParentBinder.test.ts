import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { describe, expect, test } from "vitest";

import { createOutlineScrollParentBinder } from "./outlineScrollParentBinder";

/**
 * 回归护栏：绑定结果必须写回注入的实例作用域存储。
 *
 * 此前 command 写的是模块级 `boundScrollParent`，而 registry 的
 * `TableOfContents.scrollParent` getter 读的是 `ctx.outline.scrollParent()`，
 * 两者互不相通，导致扩展侧 scrollParent 恒回退 window；模块级单例还会让
 * 同页多个开启 outline 的编辑器互相覆盖。
 */
function createTestEditor(bindScrollParent: (el: HTMLElement | null) => void) {
  return new Editor({
    extensions: [StarterKit, createOutlineScrollParentBinder({ bindScrollParent })],
    content: "<p>hello</p>",
  });
}

describe("createOutlineScrollParentBinder", () => {
  test("bindOutlineScrollParent 把容器写回注入的 setter", () => {
    let bound: HTMLElement | null = null;
    const editor = createTestEditor((el) => {
      bound = el;
    });
    const container = document.createElement("div");

    editor.commands.bindOutlineScrollParent(container);

    expect(bound).toBe(container);
    editor.destroy();
  });

  test("destroy 时归还 null，避免持有已卸载的 DOM", () => {
    let bound: HTMLElement | null = null;
    const editor = createTestEditor((el) => {
      bound = el;
    });

    editor.commands.bindOutlineScrollParent(document.createElement("div"));
    expect(bound).not.toBeNull();

    editor.destroy();
    expect(bound).toBeNull();
  });

  test("多个实例各存各的，不互相覆盖", () => {
    let boundA: HTMLElement | null = null;
    let boundB: HTMLElement | null = null;

    const editorA = createTestEditor((el) => {
      boundA = el;
    });
    const editorB = createTestEditor((el) => {
      boundB = el;
    });

    const containerA = document.createElement("div");
    const containerB = document.createElement("div");

    editorA.commands.bindOutlineScrollParent(containerA);
    editorB.commands.bindOutlineScrollParent(containerB);

    expect(boundA).toBe(containerA);
    expect(boundB).toBe(containerB);

    editorA.destroy();
    editorB.destroy();
  });
});
