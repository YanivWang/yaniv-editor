// @vitest-environment jsdom

/**
 * 这里锁的是**删除 `normalizeTemplateHtml` 的依据**。
 *
 * 那个函数把 `<td></td>` 补成 `<td><p></p></td>`，理由是「满足 tableCell schema」。
 * 实测这件事 ProseMirror 自己就做了：tableCell 的 content 是 `block+`，
 * 解析空单元格时会自动补一个 paragraph——补与不补产出的文档 JSON **完全相同**，
 * 而全部内置模板本来就写了 `<td><p></p></td>`，函数对它们是纯 no-op。
 *
 * 万一将来 tiptap 改了这个行为，下面第一条就会转红，提醒把补全逻辑加回来。
 */
import { Table } from "@tiptap/extension-table";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { TableCellWithBackground } from "@/extensions/table/TableCellWithBackground";
import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import { builtinTemplates } from "./templates";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

const editors: Editor[] = [];

function makeEditor(): Editor {
  const el = document.createElement("div");
  document.body.append(el);
  const editor = new Editor({
    element: el,
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableCellWithBackground,
      TableHeader,
    ],
    content: "<p></p>",
  });
  editors.push(editor);
  return editor;
}

function insertAndGetJson(html: string): string {
  const editor = makeEditor();
  editor.commands.setContent("<p></p>");
  editor.commands.insertContent(html);
  return JSON.stringify(editor.getJSON());
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

describe("空表格单元格由 schema 自动补段落", () => {
  it("补与不补产出的文档完全相同", () => {
    const raw = "<table><tr><th>H</th><th>I</th></tr><tr><td></td><td>x</td></tr></table>";
    const preNormalized = raw.replace(/<td><\/td>/g, "<td><p></p></td>");

    expect(preNormalized).not.toBe(raw); // 两个输入确实不同
    expect(insertAndGetJson(raw)).toBe(insertAndGetJson(preNormalized));
  });

  it("空单元格里确实有一个 paragraph", () => {
    const json = insertAndGetJson("<table><tr><th>H</th></tr><tr><td></td></tr></table>");
    const doc = JSON.parse(json) as {
      content: { type: string; content?: unknown[] }[];
    };
    const table = doc.content.find((node) => node.type === "table");
    expect(table).toBeTruthy();
    expect(json).toContain('"type":"tableCell"');
    // 单元格不是空的：里面躺着 schema 自动补的 paragraph
    expect(json).toContain('"content":[{"type":"paragraph"}]');
  });

  it("带属性、带空白的空单元格同样被补上", () => {
    const json = insertAndGetJson(
      '<table><tr><th>H</th></tr><tr><td colspan="1">   </td></tr></table>',
    );
    expect(json).toContain('"type":"tableCell"');
    expect(json).toContain('"content":[{"type":"paragraph"}]');
  });
});

describe("内置模板", () => {
  it("每个模板都能插入且不为空", () => {
    expect(builtinTemplates.length).toBeGreaterThan(0);

    for (const tpl of builtinTemplates) {
      const editor = makeEditor();
      editor.commands.setContent("<p></p>");
      editor.commands.insertContent(tpl.content);

      const json = JSON.stringify(editor.getJSON());
      expect(json.length, `模板 ${tpl.key} 插入后为空`).toBeGreaterThan(50);
      // 模板正文里的中文标题必须活着（内容没被 schema 丢掉）
      expect(editor.getText().trim(), `模板 ${tpl.key} 没有文本`).not.toBe("");
    }
  });

  it("含表格的模板插入后表格结构完整", () => {
    const withTable = builtinTemplates.filter((tpl) => tpl.content.includes("<table>"));
    expect(withTable.length).toBeGreaterThan(0);

    for (const tpl of withTable) {
      const editor = makeEditor();
      editor.commands.setContent("<p></p>");
      editor.commands.insertContent(tpl.content);

      const json = JSON.stringify(editor.getJSON());
      expect(json, `模板 ${tpl.key} 的表格丢了`).toContain('"type":"table"');
      expect(json, `模板 ${tpl.key} 的表头丢了`).toContain('"type":"tableHeader"');
    }
  });
});
