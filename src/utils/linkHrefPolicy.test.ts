// @vitest-environment jsdom

import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { adaptJsonToSchema } from "@/core/session/contentAdapter";
import { createLinkExtension } from "@/extensions/linkExtension";

import { sanitizeLinkHrefMarks } from "./linkHrefPolicy";

import type { JSONContent } from "@tiptap/core";

/**
 * 回归护栏：链接 href 的白名单必须覆盖**所有**入口，而不只是 DOM 边界。
 *
 * `isAllowedUri` 只在 HTML 解析 / 粘贴 / `setLink()` 上生效。JSON 内容不经过这些路径：
 * 危险 href 会直接落进文档 attrs。由于 TipTap 在 renderHTML 侧会把输出洗成 `href=""`，
 * `getHTML()` 完全看不出异常——但 `getJSON()`（公开 API）会把 `javascript:alert(1)`
 * 原样交给宿主，宿主持久化后自行渲染即中招；编辑器自身的「打开链接」也读这个值。
 */
const DANGEROUS = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "vbscript:msgbox(1)",
  "data:text/html,<script>alert(1)</script>",
];

let editor: Editor | null = null;

function mount(): Editor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: [StarterKit.configure({ link: false }), createLinkExtension()],
    content: "<p>x</p>",
  });
  return editor;
}

function linkJson(href: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href } }] }],
      },
    ],
  };
}

/** 文档里所有 link mark 的 href */
function linkHrefs(e: Editor): unknown[] {
  const found: unknown[] = [];
  e.state.doc.descendants((node) => {
    for (const mark of node.marks) {
      if (mark.type.name === "link") found.push(mark.attrs.href);
    }
  });
  return found;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("sanitizeLinkHrefMarks（JSON 漏斗）", () => {
  it.each(DANGEROUS)("丢弃 href=%s 的 link mark，保留其它 mark", (href) => {
    const marks = [{ type: "bold" }, { type: "link", attrs: { href } }];
    expect(sanitizeLinkHrefMarks(marks)).toEqual([{ type: "bold" }]);
  });

  it("合法 href 原样保留（不做归一化改写，与 HTML 路径一致）", () => {
    for (const href of [
      "https://example.com/a",
      "example.com",
      "/docs",
      "#anchor",
      "mailto:a@b.c",
    ]) {
      const marks = [{ type: "link", attrs: { href } }];
      expect(sanitizeLinkHrefMarks(marks), href).toBe(marks);
    }
  });

  it("没有 link mark 时返回原数组", () => {
    const marks = [{ type: "bold" }, { type: "italic" }];
    expect(sanitizeLinkHrefMarks(marks)).toBe(marks);
  });

  it("非字符串 href 一律拒收（不强转后再判定）", () => {
    for (const href of [{ toString: () => "https://ok.com" }, 42, ["https://ok.com"]]) {
      expect(sanitizeLinkHrefMarks([{ type: "link", attrs: { href } }])).toBeUndefined();
    }
  });

  it("全部被丢弃时返回 undefined（而不是空数组）", () => {
    expect(
      sanitizeLinkHrefMarks([{ type: "link", attrs: { href: "javascript:1" } }]),
    ).toBeUndefined();
  });
});

describe("adaptJsonToSchema 清洗 link href", () => {
  it.each(DANGEROUS)("%s 不会进入适配结果", (href) => {
    const e = mount();
    const adapted = JSON.stringify(adaptJsonToSchema(linkJson(href), e.state.schema));
    expect(adapted).not.toContain(href);
    expect(adapted).toContain("click");
  });
});

describe("四条入口逐一断言", () => {
  it.each(DANGEROUS)("JSON setContent：%s 不落进 attrs，也不经 getJSON 泄漏", (href) => {
    const e = mount();
    e.commands.setContent(linkJson(href));

    expect(linkHrefs(e), "文档 attrs 不应保留危险 href").toEqual([]);
    expect(JSON.stringify(e.getJSON())).not.toContain("javascript:");
    expect(e.getText()).toContain("click");
  });

  it.each(DANGEROUS)("HTML setContent：%s 被拦下（原本就安全，防回归）", (href) => {
    const e = mount();
    e.commands.setContent(`<p><a href="${href}">click</a></p>`);
    expect(linkHrefs(e)).toEqual([]);
  });

  it.each(DANGEROUS)("insertContent（事务级）：%s 被补偿事务摘掉", (href) => {
    const e = mount();
    e.commands.insertContent({
      type: "text",
      text: "click",
      marks: [{ type: "link", attrs: { href } }],
    });

    expect(linkHrefs(e)).toEqual([]);
  });

  it("合法链接在四条入口都能正常保留", () => {
    const e = mount();

    e.commands.setContent(linkJson("https://example.com/a"));
    expect(linkHrefs(e)).toEqual(["https://example.com/a"]);

    e.commands.setContent('<p><a href="https://example.com/b">b</a></p>');
    expect(linkHrefs(e)).toEqual(["https://example.com/b"]);
  });

  it("补偿事务不进历史 —— 撤销不会把危险值撤回来", () => {
    const e = mount();
    e.commands.insertContent({
      type: "text",
      text: "click",
      marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
    });
    e.commands.undo();

    expect(JSON.stringify(e.getJSON())).not.toContain("javascript:");
  });
});
