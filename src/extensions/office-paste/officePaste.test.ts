import { describe, expect, it } from "vitest";

import { applyOfficeHtmlTransforms, mergeOfficeHtmlTransforms } from "./pipeline";
import { transformRemoveBookmarks } from "./transform/bookmark";
import { transformMsoHtmlClasses } from "./transform/htmlClasses";
import { transformRemoveLineNumberWrapper } from "./transform/lineNumber";
import { transformLists } from "./transform/lists";
import { transformMsoStyles } from "./transform/style";
import {
  hasImageInPastePayload,
  isOfficeHtml,
  isOfficeLikeClipboardData,
  parseLetterNumber,
  parseRomanNumber,
  parseStyleAttribute,
  replaceImageWithPlaceholder,
  unwrapNode,
} from "./utils";

const PLACEHOLDER = "<p>[image]</p>";

describe("列表序号解析", () => {
  it("罗马数字", () => {
    expect(parseRomanNumber("i")).toBe(1);
    expect(parseRomanNumber("IV")).toBe(4);
    expect(parseRomanNumber("IX")).toBe(9);
    expect(parseRomanNumber("XIV")).toBe(14);
    expect(parseRomanNumber("MCMXCIV")).toBe(1994);
  });

  it("罗马数字遇到无效字符按 0 计", () => {
    expect(parseRomanNumber("")).toBe(0);
    expect(parseRomanNumber("?")).toBe(0);
  });

  it("字母序号", () => {
    expect(parseLetterNumber("a")).toBe(1);
    expect(parseLetterNumber("z")).toBe(26);
    expect(parseLetterNumber("aa")).toBe(27);
    expect(parseLetterNumber("AB")).toBe(28);
  });
});

describe("parseStyleAttribute", () => {
  it("解析 style 声明并去除空白", () => {
    const el = document.createElement("div");
    el.setAttribute("style", "margin-left: 24px; mso-list:l0 level1 lfo1;color:#333");

    expect(parseStyleAttribute(el)).toEqual({
      "margin-left": "24px",
      "mso-list": "l0 level1 lfo1",
      color: "#333",
    });
  });

  it("无 style 属性时返回空对象；忽略畸形片段", () => {
    const el = document.createElement("div");
    expect(parseStyleAttribute(el)).toEqual({});

    el.setAttribute("style", ";;:novalue;good:1;");
    expect(parseStyleAttribute(el)).toEqual({ good: "1" });
  });
});

describe("unwrapNode", () => {
  it("用子节点替换自身", () => {
    const root = document.createElement("div");
    root.innerHTML = "<span><b>a</b><i>b</i></span>";
    unwrapNode(root.firstChild!);

    expect(root.innerHTML).toBe("<b>a</b><i>b</i>");
  });

  it("游离节点无父级时静默返回", () => {
    expect(() => unwrapNode(document.createElement("div"))).not.toThrow();
  });
});

describe("isOfficeHtml", () => {
  it("识别 Word 特征", () => {
    for (const html of [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office">',
      '<p class="MsoNormal">x</p>',
      "<p class=MsoListParagraph>x</p>",
      "<span style='mso-list:l0'>x</span>",
      "<xml><w:WordDocument/></xml>",
    ]) {
      expect(isOfficeHtml(html), html).toBe(true);
    }
  });

  it("识别 WPS 特征", () => {
    for (const html of [
      '<meta name="generator" content="WPS Office">',
      "<html>Kingsoft</html>",
      '<html xmlns:wps="x">',
    ]) {
      expect(isOfficeHtml(html), html).toBe(true);
    }
  });

  it("普通 HTML 与空串不误判", () => {
    expect(isOfficeHtml("")).toBe(false);
    expect(isOfficeHtml("<p>hello <b>world</b></p>")).toBe(false);
  });
});

describe("hasImageInPastePayload", () => {
  it("命中图片文件", () => {
    const file = new File([""], "a.png", { type: "image/png" });
    expect(hasImageInPastePayload([file], "")).toBe(true);
  });

  it("命中 img / v:imagedata 标签", () => {
    expect(hasImageInPastePayload([], '<img src="x">')).toBe(true);
    expect(hasImageInPastePayload([], "<v:imagedata src='x'/>")).toBe(true);
  });

  it("纯文本不命中", () => {
    expect(hasImageInPastePayload([], "<p>text</p>")).toBe(false);
    expect(hasImageInPastePayload([], "")).toBe(false);
  });
});

describe("replaceImageWithPlaceholder", () => {
  it("替换 img 标签", () => {
    expect(replaceImageWithPlaceholder('<p><img src="a.png"></p>', PLACEHOLDER)).toBe(
      `<p>${PLACEHOLDER}</p>`,
    );
  });

  it("替换 VML shape 整块", () => {
    const html = "<v:shape id='x'><v:imagedata src='a.png'/></v:shape>";
    expect(replaceImageWithPlaceholder(html, PLACEHOLDER)).toBe(PLACEHOLDER);
  });

  it("空串原样返回", () => {
    expect(replaceImageWithPlaceholder("", PLACEHOLDER)).toBe("");
  });
});

describe("isOfficeLikeClipboardData", () => {
  function makeClipboard(data: Record<string, string>, types: string[] = []): DataTransfer {
    return {
      getData: (type: string) => data[type] ?? "",
      types: types.length ? types : Object.keys(data),
    } as unknown as DataTransfer;
  }

  it("null 直接返回 false", () => {
    expect(isOfficeLikeClipboardData(null)).toBe(false);
  });

  it("HTML 带 Office 特征时为 true", () => {
    expect(
      isOfficeLikeClipboardData(makeClipboard({ "text/html": "<p class=MsoNormal>x</p>" })),
    ).toBe(true);
  });

  it("仅有 RTF 类型也判为 Office 来源", () => {
    expect(isOfficeLikeClipboardData(makeClipboard({}, ["text/rtf"]))).toBe(true);
    expect(isOfficeLikeClipboardData(makeClipboard({}, ["application/rtf"]))).toBe(true);
  });

  it("普通 HTML 剪贴板为 false", () => {
    expect(
      isOfficeLikeClipboardData(makeClipboard({ "text/html": "<p>plain</p>" }, ["text/html"])),
    ).toBe(false);
  });
});

describe("HTML transform 链", () => {
  it("成对的书签标记被拆掉，文本保留", () => {
    // Word 的书签是成对出现的：<a name> 锚点 + 引用它的 mso-bookmark 内联样式
    const html =
      '<p><a name="_Toc123">标题</a>' + '<span style="mso-bookmark:_Toc123">副标题</span>正文</p>';
    const out = transformRemoveBookmarks(html);

    expect(out).not.toContain("_Toc123");
    expect(out).not.toContain("mso-bookmark");
    expect(out).toContain("标题");
    expect(out).toContain("副标题");
    expect(out).toContain("正文");
  });

  it("孤立的 <a name> 不被动 —— 没有配对的 mso-bookmark 就不是 Word 书签", () => {
    const out = transformRemoveBookmarks('<p><a name="anchor">锚点</a></p>');
    expect(out).toContain("anchor");
    expect(out).toContain("锚点");
  });

  it("剥离 mso- 私有样式声明", () => {
    const out = transformMsoStyles(
      '<p style="mso-list:l0 level1 lfo1;color:#333;mso-fareast-font-family:宋体">x</p>',
    );
    expect(out).not.toContain("mso-list");
    expect(out).not.toContain("mso-fareast-font-family");
  });

  it("清理 Mso* 类名", () => {
    const out = transformMsoHtmlClasses('<p class="MsoNormal other">x</p>');
    expect(out).not.toContain("MsoNormal");
  });

  /**
   * 这条此前的输入是 `<div style="mso-element:para-border-div">`——里面**根本没有**
   * `MsoLineNumber` 类，函数对它是空操作，`toContain("正文")` 恒真：
   * 把实现换成 `html => html` 也照样通过。测试名说「移除行号包裹层」，实际什么也没测到。
   */
  it("移除行号包裹层：包裹元素消失，内容保留", () => {
    const out = transformRemoveLineNumberWrapper('<div class="MsoLineNumber"><p>正文</p></div>');
    expect(out).toContain("正文");
    expect(out).not.toContain("MsoLineNumber");
    expect(out).not.toContain("<div");
  });

  it("行号包裹层是 span 时同样拆掉", () => {
    const out = transformRemoveLineNumberWrapper(
      '<p><span class="MsoLineNumber">12</span>正文</p>',
    );
    expect(out).not.toContain("<span");
    expect(out).toContain("正文");
  });

  it("多类名元素也命中（class 里还有别的类）", () => {
    const out = transformRemoveLineNumberWrapper(
      '<p><span class="MsoNormal MsoLineNumber">7</span>多类名</p>',
    );
    expect(out).not.toContain("<span");
    expect(out).toContain("多类名");
  });

  /**
   * 与 `transformMsoHtmlClasses` 的精确口径不同，这里**有意**用子串匹配。
   *
   * 那边选择器与操作是两套口径（`[class*=]` 子串选中，`classList.remove` 按 token 精确删），
   * 对 `MsoNormalTable` 一类是空操作，白跑一趟——所以必须收紧。这里操作是 unwrap
   * **整个元素**，子串只是把范围放宽。实测差异面只有两项：`MsoLineNumberText`
   * （若 Word 有此变体，正是想处理的）与 `xMsoLineNumbery`（要误伤得有类名把它嵌在中间，
   * Word 剪贴板 HTML 不会这样输出）。收紧成 `.MsoLineNumber` 反而可能漏掉变体。
   *
   * ⚠️ 一条未验证的观察：`MsoLineNumber` 在 Word 里是**字符样式**，实际形态更可能是
   * `<span class="MsoLineNumber">12</span>` 这样的行号数字本身，而不是包住正文的容器。
   * 那样 unwrap 会把行号数字留进正文（实测 `<span class="MsoLineNumber">12</span>正文`
   * → `12正文`）。判定该整体删除还是 unwrap 需要真实 Word 剪贴板样本，
   * 拿到之前不改——改错的代价是**丢正文**。
   */
  it("子串匹配是有意的：MsoLineNumber* 变体一并拆掉", () => {
    const out = transformRemoveLineNumberWrapper(
      '<p><span class="MsoLineNumberText">9</span>变体</p>',
    );
    expect(out).not.toContain("<span");
    expect(out).toContain("变体");
  });

  it("不含 MsoLineNumber 的内容原样保留", () => {
    const out = transformRemoveLineNumberWrapper(
      '<div style="mso-element:para-border-div"><p>正文</p></div>',
    );
    expect(out).toContain("<div");
    expect(out).toContain("正文");
  });

  it("把 mso-list 段落还原为真实列表", () => {
    const html = [
      '<p class=MsoListParagraph style="mso-list:l0 level1 lfo1">',
      "<span style='mso-list:Ignore'>1.</span>第一项</p>",
      '<p class=MsoListParagraph style="mso-list:l0 level1 lfo1">',
      "<span style='mso-list:Ignore'>2.</span>第二项</p>",
    ].join("");
    const out = transformLists(html);

    expect(out).toMatch(/<(ol|ul)/i);
    expect(out).toContain("第一项");
    expect(out).toContain("第二项");
  });

  it("非列表内容不被 transformLists 破坏", () => {
    const out = transformLists("<p>普通段落</p>");
    expect(out).toContain("普通段落");
  });
});

describe("applyOfficeHtmlTransforms 流水线", () => {
  const officeHtml =
    '<p class="MsoNormal" style="mso-list:l0;color:red">' +
    '<a name="_Toc1">t</a><span style="mso-bookmark:_Toc1">u</span>' +
    '<img src="a.png"></p>';

  it("默认开启全部 transform", () => {
    const out = applyOfficeHtmlTransforms(officeHtml, {
      imagePlaceholderHtml: PLACEHOLDER,
      transforms: mergeOfficeHtmlTransforms(),
    });

    expect(out).not.toContain("MsoNormal");
    expect(out).not.toContain("mso-list");
    expect(out).not.toContain("mso-bookmark");
    expect(out).not.toContain("_Toc1");
    expect(out).toContain(PLACEHOLDER);
  });

  it("单项可关闭 —— 关掉图片占位后保留原 img", () => {
    const out = applyOfficeHtmlTransforms(officeHtml, {
      imagePlaceholderHtml: PLACEHOLDER,
      transforms: mergeOfficeHtmlTransforms({ imagePlaceholder: false }),
    });

    expect(out).toContain("<img");
    expect(out).not.toContain(PLACEHOLDER);
  });

  it("mergeOfficeHtmlTransforms 只覆盖显式传入的键", () => {
    expect(mergeOfficeHtmlTransforms({ lists: false })).toEqual({
      lists: false,
      bookmarks: true,
      msoStyles: true,
      msoHtmlClasses: true,
      lineNumber: true,
      imagePlaceholder: true,
    });
  });
});
