import { Extension, getSchema } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, test } from "vitest";
import { ref } from "vue";

import { withTransactionGuard, BYPASS_GUARD_META } from "@/capabilities/transactionGuard";
import {
  ContentAdapter,
  adaptJsonToSchema,
  prepareEditorContent,
} from "@/core/session/contentAdapter";
import { TableCellWithBackground } from "@/extensions/table/TableCellWithBackground";

import type { JSONContent } from "@tiptap/core";

const TABLE_EXTENSIONS = [
  StarterKit,
  Table.configure({ resizable: true }),
  TableRow,
  TableCellWithBackground,
  TableHeader,
];

const SAMPLE_TABLE_HTML = `<p>before</p>
<table>
  <tr><th>功能</th><th>操作</th></tr>
  <tr><td>表格</td><td>编辑</td></tr>
</table>
<p>after</p>`;

describe("ContentAdapter", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  test("setContent 在 editor.setEditable(false) 后仍能写入", () => {
    const isEditable = ref(false);
    const guarded = withTransactionGuard(Extension.create({ name: "guardProbe" }), isEditable);

    editor = new Editor({
      extensions: [StarterKit, guarded],
      content: "<p>before</p>",
    });
    editor.setEditable(false);

    ContentAdapter.setContent(editor, {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "after" }] }],
    });

    expect(editor.getText()).toBe("after");
  });

  test("BYPASS_GUARD_META 是 Symbol", () => {
    expect(typeof BYPASS_GUARD_META).toBe("symbol");
  });

  test("普通业务 commands 在 editable=false 下被守卫拦截", () => {
    const isEditable = ref(false);
    const guarded = withTransactionGuard(Extension.create({ name: "guardProbe" }), isEditable);

    editor = new Editor({
      extensions: [StarterKit, guarded],
      content: "<p>before</p>",
    });
    editor.setEditable(false);

    const before = editor.getJSON();
    editor.commands.setContent("<p>hi</p>");
    expect(editor.getJSON()).toEqual(before);
  });

  test("adaptJsonToSchema 剥离 table* 并保留单元格内段落文本", () => {
    const withTable = new Editor({
      extensions: TABLE_EXTENSIONS,
      content: SAMPLE_TABLE_HTML,
    });
    const json = withTable.getJSON();
    withTable.destroy();

    expect(JSON.stringify(json)).toContain("tableHeader");

    const basicSchema = getSchema([StarterKit]);
    const adapted = adaptJsonToSchema(json, basicSchema);

    expect(JSON.stringify(adapted)).not.toContain("tableHeader");
    expect(JSON.stringify(adapted)).not.toContain('"type":"table"');
    expect(JSON.stringify(adapted)).toContain("功能");
    expect(JSON.stringify(adapted)).toContain("编辑");

    // 必须能直接 nodeFromJSON，且不触发 TipTap Invalid content
    const warns: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warns.push(args);
    };
    editor = new Editor({
      extensions: [StarterKit],
      content: adapted,
    });
    console.warn = originalWarn;

    expect(warns.some((w) => String(w[0]).includes("Invalid content"))).toBe(false);
    expect(editor.getText()).toContain("功能");
    expect(editor.getText()).toContain("编辑");
  });

  test("prepareEditorContent 清洗 JSON 供 new Editor 使用", () => {
    const withTable = new Editor({
      extensions: TABLE_EXTENSIONS,
      content: SAMPLE_TABLE_HTML,
    });
    const json = withTable.getJSON() as JSONContent;
    withTable.destroy();

    const prepared = prepareEditorContent(json, [StarterKit]);
    expect(typeof prepared).toBe("object");
    expect(JSON.stringify(prepared)).not.toContain("tableHeader");

    const warns: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warns.push(args);
    };
    editor = new Editor({
      extensions: [StarterKit],
      content: prepared,
    });
    console.warn = originalWarn;

    expect(warns.some((w) => String(w[0]).includes("Invalid content"))).toBe(false);
  });

  test("setContent 接受含未知节点的 JSON 且不抛 warn", () => {
    const withTable = new Editor({
      extensions: TABLE_EXTENSIONS,
      content: SAMPLE_TABLE_HTML,
    });
    const json = withTable.getJSON();
    withTable.destroy();

    editor = new Editor({
      extensions: [StarterKit],
      content: "<p></p>",
    });

    const warns: unknown[][] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warns.push(args);
    };
    ContentAdapter.setContent(editor, json);
    console.warn = originalWarn;

    expect(warns.some((w) => String(w[0]).includes("Invalid content"))).toBe(false);
    expect(warns.some((w) => String(w[0]).includes("Failed to parse"))).toBe(false);
    expect(editor.getText()).toContain("功能");
  });

  test("adaptJsonToSchema 剥离未知 mark", () => {
    const schema = getSchema([StarterKit]);
    const adapted = adaptJsonToSchema(
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "hi",
                marks: [{ type: "bold" }, { type: "nonexistentMark" }],
              },
            ],
          },
        ],
      },
      schema,
    );

    const marks = adapted.content?.[0]?.content?.[0]?.marks ?? [];
    expect(marks.map((m) => (typeof m === "string" ? m : m.type))).toEqual(["bold"]);
  });
});
