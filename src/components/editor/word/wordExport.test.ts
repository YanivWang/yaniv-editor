import { Paragraph, Table } from "docx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exportToWord } from "./wordExport";

/**
 * 只桩掉两处 I/O：
 * - `Packer.toBlob`：真实打包会跑完整 zip，测试里没必要，也拿不到可读结构；
 * - `file-saver`：jsdom 无下载行为。
 *
 * `new Document(...)` 保持真实，并在此捕获它收到的 section children，
 * 从而对「HTML → docx 节点树」的映射做结构断言（这是本模块的全部职责）。
 */
const capturedSections: { children: unknown[] }[] = [];

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

vi.mock("docx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("docx")>();
  class CapturingDocument extends actual.Document {
    constructor(options: ConstructorParameters<typeof actual.Document>[0]) {
      const sections = (options as { sections?: { children: unknown[] }[] }).sections ?? [];
      capturedSections.push(...sections);
      super(options);
    }
  }
  // Paragraph / TextRun 构造完就只剩 XML 树，读不回 options，所以在构造处留一份
  class CapturingParagraph extends actual.Paragraph {
    readonly capturedOptions: Record<string, unknown>;
    constructor(options: ConstructorParameters<typeof actual.Paragraph>[0]) {
      super(options);
      this.capturedOptions = (options ?? {}) as Record<string, unknown>;
    }
  }
  class CapturingTextRun extends actual.TextRun {
    readonly capturedOptions: Record<string, unknown>;
    constructor(options: ConstructorParameters<typeof actual.TextRun>[0]) {
      super(options);
      this.capturedOptions = typeof options === "string" ? { text: options } : options;
    }
  }
  return {
    ...actual,
    Document: CapturingDocument,
    Paragraph: CapturingParagraph,
    TextRun: CapturingTextRun,
    Packer: { ...actual.Packer, toBlob: vi.fn(() => Promise.resolve(new Blob(["x"]))) },
  };
});

const { saveAs } = await import("file-saver");

/** 取最近一次导出的顶层块节点 */
function lastChildren(): unknown[] {
  return capturedSections[capturedSections.length - 1]?.children ?? [];
}

type Captured = { capturedOptions?: Record<string, unknown> };

/** 递归取出一个 docx 节点下的全部文本（TextRun / ExternalHyperlink 的 children） */
function textOf(node: unknown): string {
  const options = (node as Captured)?.capturedOptions;
  if (!options) return "";
  if (typeof options.text === "string") return options.text;

  const children = Array.isArray(options.children) ? options.children : [];
  return children.map(textOf).join("");
}

/** 整份文档拼出的纯文本 */
function exportedText(): string {
  return lastChildren().map(textOf).join("\n");
}

beforeEach(() => {
  capturedSections.length = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exportToWord 落盘契约", () => {
  it("产出 Blob 并按传入文件名保存", async () => {
    await exportToWord("<p>hello</p>", "报告");

    expect(saveAs).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(saveAs).mock.calls[0] as [Blob, string];
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toBe("报告.docx");
  });

  it("未传文件名时回退为 document.docx", async () => {
    await exportToWord("<p>x</p>");
    expect(vi.mocked(saveAs).mock.calls[0][1]).toBe("document.docx");
  });

  it("空 HTML 仍产出至少一个段落，不抛错", async () => {
    await exportToWord("");
    expect(lastChildren().length).toBeGreaterThanOrEqual(1);
    expect(saveAs).toHaveBeenCalledTimes(1);
  });
});

describe("块级结构映射", () => {
  it("段落与各级标题都映射为 Paragraph", async () => {
    await exportToWord("<h1>一</h1><h2>二</h2><h3>三</h3><p>正文</p>");

    const children = lastChildren();
    expect(children).toHaveLength(4);
    expect(children.every((c) => c instanceof Paragraph)).toBe(true);
  });

  it("表格映射为 Table 而不是被拍平成段落", async () => {
    await exportToWord(
      "<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>",
    );

    const children = lastChildren();
    expect(children.filter((c) => c instanceof Table)).toHaveLength(1);
  });

  it("有序 / 无序列表按项展开为多个 Paragraph", async () => {
    await exportToWord("<ul><li>a</li><li>b</li><li>c</li></ul>");
    expect(lastChildren().length).toBeGreaterThanOrEqual(3);

    capturedSections.length = 0;
    await exportToWord("<ol><li>1</li><li>2</li></ol>");
    expect(lastChildren().length).toBeGreaterThanOrEqual(2);
  });

  it("嵌套列表不丢内容", async () => {
    await exportToWord("<ul><li>外<ul><li>内</li></ul></li></ul>");
    expect(lastChildren().length).toBeGreaterThanOrEqual(2);
  });

  it("代码块按行拆成多个 Paragraph", async () => {
    await exportToWord("<pre><code>line1\nline2\nline3</code></pre>");
    expect(lastChildren().length).toBeGreaterThanOrEqual(3);
  });

  it("混合文档保持块顺序与数量", async () => {
    await exportToWord(
      "<h1>标题</h1><p>段落</p><table><tbody><tr><td>x</td></tr></tbody></table><p>结尾</p>",
    );

    const children = lastChildren();
    expect(children[0]).toBeInstanceOf(Paragraph);
    expect(children[1]).toBeInstanceOf(Paragraph);
    expect(children[2]).toBeInstanceOf(Table);
    expect(children[3]).toBeInstanceOf(Paragraph);
  });
});

describe("行内与属性解析不崩溃", () => {
  const cases: Array<[string, string]> = [
    ["加粗 / 斜体 / 下划线 / 删除线", "<p><b>b</b><i>i</i><u>u</u><s>s</s></p>"],
    ["上标 / 下标", "<p>x<sup>2</sup>y<sub>1</sub></p>"],
    ["行内代码", "<p>see <code>foo()</code></p>"],
    ["链接", '<p><a href="https://example.com">link</a></p>'],
    ["无 href 的链接", "<p><a>bare</a></p>"],
    ["对齐样式", '<p style="text-align:center">居中</p><p style="text-align:right">右</p>'],
    ["图片（docx 不支持时应跳过而非抛错）", '<p><img src="data:image/png;base64,AAA"></p>'],
    ["深层嵌套行内标签", "<p><b><i><u>deep</u></i></b></p>"],
    ["空段落", "<p></p>"],
    ["纯文本无包裹标签", "裸文本"],
  ];

  for (const [name, html] of cases) {
    it(name, async () => {
      await expect(exportToWord(html)).resolves.toBeUndefined();
      expect(saveAs).toHaveBeenCalledTimes(1);
    });
  }
});

/**
 * 回归护栏：两处会静默丢/重内容的解析缺陷。
 *
 * 都不是「不崩溃」能覆盖的——导出照样成功，只是 .docx 打开后内容不对，
 * 所以这里断言文本本身。
 */
describe("内容保真", () => {
  it("引用块的文字不能丢，且带上缩进与左边框", async () => {
    await exportToWord("<blockquote><p>被引用的文字</p></blockquote>");

    const children = lastChildren();
    expect(exportedText()).toContain("被引用的文字");

    const quoted = children.find((c) => textOf(c).includes("被引用的文字")) as Captured;
    expect(quoted.capturedOptions?.indent).toEqual({ left: 720 });
    expect(quoted.capturedOptions?.border).toMatchObject({
      left: { style: "single", size: 6, color: "999999" },
    });
  });

  it("引用块内的多个段落逐段保留", async () => {
    await exportToWord("<blockquote><p>第一段</p><p>第二段</p></blockquote>");

    const quoted = lastChildren().filter((c) => (c as Captured).capturedOptions?.indent);
    expect(quoted).toHaveLength(2);
    expect(quoted.map(textOf)).toEqual(["第一段", "第二段"]);
  });

  it("嵌套列表的文字只出现一次，不并进父项", async () => {
    await exportToWord("<ul><li>外<ul><li>内</li></ul></li></ul>");

    const texts = lastChildren().map(textOf);
    expect(texts).toEqual(["外", "内"]);
    expect(exportedText().match(/内/g)).toHaveLength(1);
  });

  it("三层嵌套按层级各出一次", async () => {
    await exportToWord("<ul><li>A<ul><li>B<ul><li>C</li></ul></li></ul></li></ul>");

    expect(lastChildren().map(textOf)).toEqual(["A", "B", "C"]);
  });

  it("列表项内的行内标记仍然解析（跳过的只是嵌套列表）", async () => {
    await exportToWord("<ul><li><b>粗</b>普通<ul><li>子</li></ul></li></ul>");

    expect(lastChildren().map(textOf)).toEqual(["粗普通", "子"]);
  });
});
