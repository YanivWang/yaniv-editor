// @vitest-environment jsdom

/**
 * Word 导入：mammoth 交出的 HTML 在写进文档之前要过一遍链接策略。
 *
 * mammoth 自己生成 HTML（不透传 Word 的原始标记），所以不会带 `onclick` 这类事件属性；
 * 真正需要看住的是 `<a href>`——Word 文档里的超链接是作者可控的外部输入。
 * 图片那半由 schema 兜住：`ResizableImage` 的 `src` 有 `parseHTML` 过
 * `normalizeSafeMediaUrl`，这里一并验一次，免得两层策略各自漂移。
 *
 * mammoth 要真实的 .docx（zip 结构）才跑得动，用 mock 换掉它，
 * 被测的是**转换之后**的那段逻辑。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ResizableImage } from "@/extensions/resizableImage";
import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

const convertToHtml = vi.fn();

vi.mock("mammoth", () => ({
  default: {
    convertToHtml: (...args: unknown[]) => convertToHtml(...args),
  },
}));

import { convertWordToHtml, importWordFile } from "./wordImport";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

function docxFile(): File {
  return new File([new ArrayBuffer(8)], "a.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function mammothReturns(html: string, messages: Array<{ message: string }> = []): void {
  convertToHtml.mockResolvedValue({ value: html, messages });
}

let editor: Editor | null = null;

function createEditor(content = "<p>原有内容</p>"): Editor {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({
    element: el,
    extensions: [StarterKit.configure({ link: false }), ResizableImage],
    content,
  });
  return editor;
}

beforeEach(() => {
  convertToHtml.mockReset();
});

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

describe("convertWordToHtml 的链接清洗", () => {
  it("安全链接保留，并补上 target 与 rel", async () => {
    mammothReturns('<p><a href="https://example.com/a">站外</a></p>');

    const result = await convertWordToHtml(docxFile());

    expect(result.html).toContain('href="https://example.com/a"');
    expect(result.html).toContain('target="_blank"');
    expect(result.html).toContain('rel="noopener noreferrer"');
  });

  it("危险协议去掉 href 但保留文字，不吞内容", async () => {
    mammothReturns('<p><a href="javascript:alert(1)">点我</a></p>');

    const result = await convertWordToHtml(docxFile());

    expect(result.html).not.toContain("javascript:");
    expect(result.html).not.toContain("href=");
    expect(result.html, "只摘链接，文字要留下").toContain("点我");
  });

  it("站内锚点与相对路径原样保留（补 https 会把它劫持到站外）", async () => {
    mammothReturns('<p><a href="#heading-1">目录</a><a href="/docs/page">站内</a></p>');

    const result = await convertWordToHtml(docxFile());

    expect(result.html).toContain('href="#heading-1"');
    expect(result.html).toContain('href="/docs/page"');
  });

  it("mammoth 的警告原样交给调用方", async () => {
    mammothReturns("<p>x</p>", [{ message: "Unrecognised paragraph style" }]);

    const result = await convertWordToHtml(docxFile());

    expect(result.messages).toEqual(["Unrecognised paragraph style"]);
  });

  it("传给 mammoth 的 styleMap 覆盖六级标题", async () => {
    mammothReturns("<p>x</p>");

    await convertWordToHtml(docxFile());

    const options = convertToHtml.mock.calls[0][1] as { styleMap: string[] };
    expect(options.styleMap).toHaveLength(6);
    for (let level = 1; level <= 6; level += 1) {
      expect(options.styleMap.join("\n")).toContain(`=> h${level}:fresh`);
    }
  });
});

describe("importWordFile 写入文档", () => {
  it("替换整份文档，且这一步可以撤销回原文", async () => {
    const target = createEditor("<p>原有内容</p>");
    mammothReturns("<h1>导入的标题</h1>");

    await importWordFile(target, docxFile());

    expect(target.getHTML()).toContain("导入的标题");
    expect(target.getHTML()).not.toContain("原有内容");

    // 导入是用户的一次编辑，必须能撤销——否则原文就永久没了
    expect(target.can().undo()).toBe(true);
    target.commands.undo();
    expect(target.getHTML()).toContain("原有内容");
  });

  it("转换结果为空时不动文档", async () => {
    const target = createEditor("<p>原有内容</p>");
    mammothReturns("");

    await importWordFile(target, docxFile());

    expect(target.getHTML()).toBe("<p>原有内容</p>");
  });

  it("图片的 data: 地址能进文档，危险协议进不来（schema 层的策略）", async () => {
    const target = createEditor("<p>x</p>");
    mammothReturns(
      '<p><img src="data:image/png;base64,iVBORw0KGgo=" /><img src="javascript:alert(1)" /></p>',
    );

    await importWordFile(target, docxFile());

    const html = target.getHTML();
    expect(html).toContain("data:image/png;base64,iVBORw0KGgo=");
    expect(html).not.toContain("javascript:");
  });

  it("返回值同时交出 HTML 与警告", async () => {
    const target = createEditor();
    mammothReturns("<p>正文</p>", [{ message: "warn-1" }]);

    const result = await importWordFile(target, docxFile());

    expect(result.html).toContain("正文");
    expect(result.messages).toEqual(["warn-1"]);
  });
});
