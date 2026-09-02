import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { FormatPainter } from "./formatPainter";
import { LineHeight } from "./lineHeight";

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

describe("采样行高", () => {
  /**
   * 行高是**段落级节点属性**（`extensions/lineHeight.ts`），不在 textStyle mark 上。
   * 采样此前读 `getAttributes("textStyle").lineHeight`，恒为 undefined ——
   * 整段「复制行高」的逻辑从未生效过。
   */
  /**
   * 应用格式刷的命令链无条件走 underline / subscript / superscript / highlight /
   * textAlign 这几组 setMark|unsetMark，**少注册任何一个整条 chain 就 run 失败**
   * （实测 applyFormat 返回 false，文档纹丝不动）。
   * 采样测试用不到它们，但同一个 helper 要跑通端到端那条，这里一次注册齐。
   */
  function mountWithLineHeight(content: string): Editor {
    const element = document.createElement("div");
    document.body.appendChild(element);
    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        TextStyle,
        Underline,
        Subscript,
        Superscript,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        LineHeight,
        FormatPainter,
      ],
      content,
    });
    return editor;
  }

  it("从段落节点上采到行高", () => {
    const e = mountWithLineHeight('<p style="line-height: 2">源段落</p>');
    e.commands.setTextSelection({ from: 1, to: 4 });
    e.commands.startFormatPainting();
    expect(storageOf(e).formats.lineHeight).toBe("2");
  });

  it("从标题上也采得到", () => {
    const e = mountWithLineHeight('<h1 style="line-height: 3">标题</h1>');
    e.commands.setTextSelection({ from: 1, to: 3 });
    e.commands.startFormatPainting();
    expect(storageOf(e).formats.lineHeight).toBe("3");
  });

  it("没有行高时采到 null，不会误采成默认值", () => {
    const e = mountWithLineHeight("<p>没有行高</p>");
    e.commands.setTextSelection({ from: 1, to: 4 });
    e.commands.startFormatPainting();
    expect(storageOf(e).formats.lineHeight).toBeNull();
  });

  it("采样后应用到目标段落", () => {
    const e = mountWithLineHeight('<p style="line-height: 2">源</p><p>目标</p>');
    e.commands.setTextSelection({ from: 1, to: 2 });
    e.commands.startFormatPainting();
    e.commands.setTextSelection({ from: 4, to: 6 });
    expect(e.commands.applyFormat(), "applyFormat 应成功").toBe(true);
    expect(e.getHTML()).toMatch(/<p style="line-height: 2;?">目标<\/p>/);
  });
});
