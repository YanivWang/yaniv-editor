/**
 * 链接写入的三条路径。
 *
 * 分流逻辑抽在 `linkActions.ts`（组件只负责弹窗与校验），
 * 这里直接测那个模块——测试若复制一份组件逻辑，改回旧实现也不会转红。
 *
 * 出问题的正是分流：此前只按 `selection.empty` 判断，
 * 光标停在已有链接里（选区为空）时会掉进「插入新文本」分支，
 * 把原链接从光标处劈成两半。
 */
import { Link } from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { applyLinkToEditor, buildLinkAttrs, shouldReplaceExistingLink } from "./linkActions";

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

const make = (content: string): Editor => {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({
    element: el,
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content,
  });
  return editor;
};

const linkCount = (e: Editor): number => (e.getHTML().match(/<a /g) ?? []).length;

describe("applyLinkToEditor 的分流", () => {
  it("buildLinkAttrs 固定带安全的 target / rel", () => {
    expect(buildLinkAttrs("https://x.example.com")).toEqual({
      href: "https://x.example.com",
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });

  it("shouldReplaceExistingLink：无选区但在链接内也要算「编辑」", () => {
    const e = make('<p><a href="https://old.example.com">链接</a>尾巴</p>');
    e.commands.setTextSelection(2);
    expect(shouldReplaceExistingLink(e), "光标在链接内").toBe(true);
    e.commands.setTextSelection(7);
    expect(shouldReplaceExistingLink(e), "光标在普通文字上且无选区").toBe(false);
  });

  it("光标停在已有链接内（无选区）：更新原链接，不劈开它", () => {
    const e = make('<p><a href="https://old.example.com">旧链接</a></p>');
    e.commands.setTextSelection(3);
    applyLinkToEditor(e, "https://new.example.com");

    expect(linkCount(e), "不应产生多个 <a>").toBe(1);
    expect(e.getHTML()).toContain("https://new.example.com");
    expect(e.getHTML()).not.toContain("old.example.com");
    expect(e.getText(), "链接文字不该被改动").toBe("旧链接");
  });

  it("有选区：给选中文字加链接", () => {
    const e = make("<p>选中这段</p>");
    e.commands.setTextSelection({ from: 1, to: 5 });
    applyLinkToEditor(e, "https://a.example.com");

    expect(linkCount(e)).toBe(1);
    expect(e.getHTML()).toContain("https://a.example.com");
    expect(e.getText()).toBe("选中这段");
  });

  it("无选区且不在链接内：插入 URL 文本本身", () => {
    const e = make("<p>abc</p>");
    e.commands.setTextSelection(4);
    applyLinkToEditor(e, "https://b.example.com");

    expect(linkCount(e)).toBe(1);
    expect(e.getText()).toContain("https://b.example.com");
  });

  it("选中已有链接的一部分：整条链接一起改，不产生相邻重复", () => {
    const e = make('<p><a href="https://old.example.com">很长的链接文字</a></p>');
    e.commands.setTextSelection({ from: 2, to: 4 });
    applyLinkToEditor(e, "https://new.example.com");

    expect(linkCount(e)).toBe(1);
    expect(e.getText()).toBe("很长的链接文字");
  });
});
