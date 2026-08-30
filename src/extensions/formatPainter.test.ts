import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { FormatPainter } from "./formatPainter";

import type { FormatPainterStorage } from "./formatPainter";

let editor: Editor | null = null;

function mount(content = "<p>hello world</p>"): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: [StarterKit, FormatPainter],
    content,
  });
  return editor;
}

function storageOf(e: Editor): FormatPainterStorage {
  return e.storage.formatPainter;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("格式刷激活与取消", () => {
  it("采样后进入激活态，取消后复位", () => {
    const e = mount();
    e.commands.setTextSelection({ from: 1, to: 6 });

    e.commands.startFormatPainting();
    expect(storageOf(e).isActive).toBe(true);

    e.commands.cancelFormatPainting();
    expect(storageOf(e).isActive).toBe(false);
  });
});

/**
 * 退出编辑态时的自清（提交 447d251 的修复点之一）。
 *
 * 格式刷按钮随顶栏一起被 `v-if` 卸载，卸载路径不会调用 `cancelFormatPainting`，
 * 因此复位责任在扩展自己的 `view().update` 里。这条链路此前没有任何测试覆盖：
 * 变异掉其中的 `editor.isDestroyed` 判断，全量测试仍然全绿。
 */
describe("退出编辑态自清", () => {
  it("edit → preview 翻转时自动取消激活态", () => {
    const e = mount();
    e.commands.setTextSelection({ from: 1, to: 6 });
    e.commands.startFormatPainting();
    expect(storageOf(e).isActive).toBe(true);

    e.setEditable(false);
    expect(storageOf(e).isActive).toBe(false);
  });

  it("未激活时翻转不产生副作用", () => {
    const e = mount();
    expect(storageOf(e).isActive).toBe(false);

    e.setEditable(false);
    expect(storageOf(e).isActive).toBe(false);
  });

  it("preview → edit 方向不触发自清", () => {
    const e = mount();
    e.setEditable(false);
    e.setEditable(true);

    e.commands.setTextSelection({ from: 1, to: 6 });
    e.commands.startFormatPainting();
    // 回到编辑态后激活仍然有效，说明只在 true → false 那一次翻转清理
    expect(storageOf(e).isActive).toBe(true);
  });

  it("编辑器已销毁时翻转不抛错", () => {
    const e = mount();
    e.commands.setTextSelection({ from: 1, to: 6 });
    e.commands.startFormatPainting();

    expect(() => {
      e.destroy();
    }).not.toThrow();
    editor = null;
  });
});
