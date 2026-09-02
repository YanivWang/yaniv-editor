/**
 * Office 粘贴的**边界与不可信输入**回归。
 *
 * 剪贴板内容完全由外部决定（Word / WPS / Excel，乃至手工构造的 HTML），
 * 这里锁住的都是「畸形输入不得损坏或丢弃文档内容」这一层，
 * 与 `officePaste.test.ts` 里的正常路径转换互补。
 */
import { Color } from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";
import { ref } from "vue";

import { buildExtensions } from "@/capabilities/buildExtensions";
import type { BuildExtensionsCtx } from "@/capabilities/types";
import { resolveEditorProfile } from "@/core/runtime/resolveEditorProfile";
import { transformExcelPaste } from "@/extensions/office-paste/transform/excel";
import { TableCellWithBackground } from "@/extensions/table/TableCellWithBackground";
import { enUS } from "@/locales/en-US";
import type { TiptapLocale } from "@/locales/types";
import { zhCN } from "@/locales/zh-CN";

import { transformMsoHtmlClasses } from "./transform/htmlClasses";
import { transformLists } from "./transform/lists";
import { transformMsoStyles } from "./transform/style";
import { parseStyleAttribute, replaceImageWithPlaceholder, splitCssDeclarations } from "./utils";

/** transform 返回整份文档，断言只关心 body 内容 */
const body = (html: string): string => {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : html;
};

const el = (style: string): Element => {
  const node = document.createElement("div");
  node.setAttribute("style", style);
  return node;
};

describe("transformLists —— 畸形 mso-list 不得吞内容", () => {
  it("mso-list:none 是「本段不是列表」，原样保留", () => {
    const out = body(transformLists(`<p style="mso-list:none">普通段落</p>`));
    expect(out).toContain("普通段落");
    expect(out).not.toContain("<ul");
    expect(out).not.toContain("<ol");
  });

  it("解析不出层级时不删除段落", () => {
    expect(body(transformLists(`<p style="mso-list:l0 level0 lfo1">内容A</p>`))).toContain("内容A");
    expect(body(transformLists(`<p style="mso-list:l0 levelX lfo1">内容B</p>`))).toContain("内容B");
    expect(body(transformLists(`<p style="mso-list:l0 lfo1">内容C</p>`))).toContain("内容C");
  });

  it("层级被钳制，超深嵌套不会爆栈", () => {
    const out = transformLists(`<p style="mso-list:l0 level5000 lfo1">深</p>`);
    expect(out).toContain("深");
    // Word 最深 9 级；钳制后嵌套层数不得超过它
    expect((out.match(/<ul/g) ?? []).length).toBeLessThanOrEqual(9);
  });

  it("正常的多级列表照常还原", () => {
    const out = body(transformLists(`<p style="mso-list:l3 level2 lfo1">项</p>`));
    expect(out).toContain("<ul><ul><li>项</li></ul></ul>");
  });

  it("没有 l{N} 时 level / lfo 不得冒充列表 id", () => {
    // `level1` 的第 5 个字符起正好是 `l1`，未锚定的 /l[0-9]+/ 会把它当成列表 id，
    // 于是「解析不出 id 就放过」这条早退失效，段落被误转成列表。
    const out = body(transformLists(`<p style="mso-list:level1 lfo1">内容D</p>`));
    expect(out).toContain("内容D");
    expect(out).not.toContain("<ul");
  });
});

describe("transformMsoStyles —— 写死的黑色要抹掉", () => {
  it("Word 原样输出的 color:black（无空格、无 mso- 同伴）也要清掉", () => {
    expect(body(transformMsoStyles(`<p style="color:black">正文</p>`))).not.toMatch(
      /color:\s*black/i,
    );
  });

  it("十六进制黑同样处理", () => {
    expect(body(transformMsoStyles(`<p style="color:#000">a</p>`))).not.toMatch(/color/i);
    expect(body(transformMsoStyles(`<p style="color:#000000">b</p>`))).not.toMatch(/color:/i);
  });

  it("非黑色与 background-color 不受影响", () => {
    expect(body(transformMsoStyles(`<p style="color:red">a</p>`))).toMatch(/color:\s*red/i);
    const bg = body(transformMsoStyles(`<p style="background-color:black">b</p>`));
    expect(bg).toMatch(/background-color:\s*(black|rgb\(0, 0, 0\))/i);
  });

  it("<o:p> 的带属性 / 跨行 / 自闭合形态都要清掉", () => {
    expect(body(transformMsoStyles(`<p>x<o:p style="a:b">&nbsp;</o:p></p>`))).not.toContain("o:p");
    expect(body(transformMsoStyles(`<p>x<o:p>\n&nbsp;\n</o:p></p>`))).not.toContain("o:p");
    expect(body(transformMsoStyles(`<p>x<o:p/></p>`))).not.toContain("o:p");
  });
});

describe("CSS 声明切分 —— 括号与引号里的分号不是分隔符", () => {
  it("data URL 的 ;base64 不被切开", () => {
    expect(parseStyleAttribute(el("background:url(data:image/png;base64,AAAB);color:red"))).toEqual(
      {
        background: "url(data:image/png;base64,AAAB)",
        color: "red",
      },
    );
  });

  it("引号内的分号不被切开", () => {
    expect(parseStyleAttribute(el(`font-family:"a;b";color:red`))).toEqual({
      "font-family": `"a;b"`,
      color: "red",
    });
  });

  it("重写含 data URL 的 style 时不丢数据", () => {
    const out = body(
      transformMsoStyles(`<p style="mso-x:1;background:url(data:image/png;base64,AAAB)">x</p>`),
    );
    expect(out).toContain("base64,AAAB)");
  });

  it("切分器本身：转义引号不提前结束字符串", () => {
    expect(splitCssDeclarations(`a:"x\\";y";b:2`)).toEqual([`a:"x\\";y"`, "b:2"]);
  });
});

describe("replaceImageWithPlaceholder —— 占位串与标签解析", () => {
  it("占位串里的 $& 不得被当成替换模式展开", () => {
    expect(replaceImageWithPlaceholder(`<img src="secret.png">`, `<span>$&</span>`)).toBe(
      `<span>$&</span>`,
    );
  });

  it("引号内的 > 不结束标签，属性碎片不得泄漏成正文", () => {
    expect(replaceImageWithPlaceholder(`<p><img alt="a>b" src="x.png">尾巴</p>`, `[IMG]`)).toBe(
      `<p>[IMG]尾巴</p>`,
    );
  });
});

describe("transformMsoHtmlClasses", () => {
  it("只动 MsoNormal 本身，不碰同前缀的其他类", () => {
    const out = body(
      transformMsoHtmlClasses(`<p class="MsoNormalTable">a</p><p class="MsoNormal">b</p>`),
    );
    expect(out).toContain(`class="MsoNormalTable"`);
    expect(out).not.toContain(`class=""`);
  });
});

describe("transformExcelPaste —— 类名与字体色", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const paste = (html: string): Editor => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    editor = new Editor({
      element: host,
      extensions: [
        StarterKit,
        TextStyle,
        Color,
        Table.configure({ resizable: true }),
        TableRow,
        TableCellWithBackground,
        TableHeader,
      ],
      content: "<p>x</p>",
    });
    editor.commands.setTextSelection(2);
    transformExcelPaste(editor.view, {
      clipboardData: { getData: (t: string) => (t === "text/html" ? html : "") },
      preventDefault: () => {},
      stopPropagation: () => {},
    } as unknown as ClipboardEvent);
    return editor;
  };

  const EXCEL = (cellClass: string) => `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><style>
.xl65 {background:#FF0000;color:#00FF00;}
.xl66 {background:#0000FF;}
</style></head>
<body><table><tr><td class="${cellClass}">A1</td></tr></table></body></html>`;

  it("多个类名的单元格样式不丢失（后写的类覆盖先写的）", () => {
    const json = JSON.stringify(paste(EXCEL("xl65 xl66")).getJSON());
    expect(json).toContain("rgb(0, 0, 255)");
  });

  it("Excel 字体色落到内容上，能被 Color mark 解析", () => {
    const json = JSON.stringify(paste(EXCEL("xl65")).getJSON());
    expect(json).toContain("textStyle");
    expect(json).toContain("rgb(0, 255, 0)");
  });
});

describe("图片占位文案跟随界面语言", () => {
  const ctxWith = (locale: TiptapLocale): BuildExtensionsCtx => ({
    locale,
    gates: resolveEditorProfile({ preset: "full" }).gates,
    isEditable: ref(true),
    blockMenuHost: {
      activate: () => {},
      openInsert: () => {},
      hide: () => {},
      updateQuery: () => {},
    } as unknown as BuildExtensionsCtx["blockMenuHost"],
    upload: { image: () => undefined, video: () => undefined },
    galleryImages: () => [],
    mentionItems: () => undefined,
    officePaste: { onPasteFromOfficeWithImages: () => undefined },
    outline: { scrollParent: () => null, bindScrollParent: () => {} },
    aiConfig: () => undefined,
  });

  const placeholderFor = async (locale: TiptapLocale): Promise<string> => {
    const extensions = await buildExtensions("full", ctxWith(locale));
    const officePaste = extensions.find((e) => e.name === "officePaste");
    return (officePaste?.options as { imagePlaceholderHtml: string }).imagePlaceholderHtml;
  };

  it("英文界面下不再插入中文占位段", async () => {
    const en = await placeholderFor(enUS);
    expect(en).toContain(enUS.editor.officePasteImagePlaceholder);
    expect(en).not.toContain("图片");
  });

  it("中文界面沿用中文占位段", async () => {
    expect(await placeholderFor(zhCN)).toContain(zhCN.editor.officePasteImagePlaceholder);
  });

  it("文案拼进 HTML 前先转义（宿主可用 createI18n 覆盖任意文案）", async () => {
    const evil = {
      ...zhCN,
      editor: { ...zhCN.editor, officePasteImagePlaceholder: `<img onerror="x">&` },
    };
    const html = await placeholderFor(evil);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&amp;");
  });
});
