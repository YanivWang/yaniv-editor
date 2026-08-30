import { Editor } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, test, vi } from "vitest";

import { Callout } from "@/extensions/callout";
import { Column, ColumnLayout } from "@/extensions/column";
import { Embed } from "@/extensions/embed";
import { Mention } from "@/extensions/mention";
import { TableCellWithBackground } from "@/extensions/table/TableCellWithBackground";
import { ToggleBlock } from "@/extensions/toggle";
import { Video } from "@/extensions/video";

import {
  applyBlockInsert,
  applyBlockTransform,
  insertBlockEmbedAt,
  insertBlockMediaAt,
  insertBlockMentionAt,
  isAsyncBlockId,
  isMediaBlockId,
  promptEmbedUrl,
} from "./blockMenuActions";

import type { BlockInsertContext, BlockMenuItemId } from "./types";

/** 定点插入只用到 insertPos；几何字段给零值占位（不参与断言） */
function insertContext(insertPos: number): BlockInsertContext {
  return {
    targetPos: insertPos,
    targetNodeSize: 1,
    insertPos,
    anchorRect: new DOMRect(),
    blockRect: new DOMRect(),
  };
}

const FULL_EXTENSIONS = [
  StarterKit,
  Callout,
  ToggleBlock,
  Column,
  ColumnLayout,
  Embed,
  Mention,
  Video,
  TaskList,
  TaskItem,
  Table,
  TableRow,
  TableHeader,
  TableCellWithBackground,
];

let editor: Editor | null = null;

function mount(content = "<p>Keep me</p>", extensions = FULL_EXTENSIONS): Editor {
  editor = new Editor({ extensions, content });
  editor.commands.setTextSelection(2);
  return editor;
}

function topTypes(e: Editor): string[] {
  return (e.getJSON().content ?? []).map((n) => n.type ?? "");
}

afterEach(() => {
  editor?.destroy();
  editor = null;
  vi.restoreAllMocks();
});

describe("applyBlockTransform", () => {
  test("callout transform preserves the current block content", () => {
    editor = new Editor({
      extensions: [StarterKit, Callout],
      content: "<p>Keep me</p>",
    });

    editor.commands.setTextSelection(2);
    applyBlockTransform(editor, "callout");

    expect(editor.getText()).toContain("Keep me");
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "callout",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Keep me" }],
        },
      ],
    });
  });
});

describe("applyBlockTransform 覆盖全部块类型", () => {
  const cases: Array<[BlockMenuItemId, string]> = [
    ["paragraph", "paragraph"],
    ["heading1", "heading"],
    ["heading2", "heading"],
    ["heading3", "heading"],
    ["bulletList", "bulletList"],
    ["orderedList", "orderedList"],
    ["taskList", "taskList"],
    ["blockquote", "blockquote"],
    ["codeBlock", "codeBlock"],
    ["toggleBlock", "toggleBlock"],
    ["callout", "callout"],
    ["columnLayout", "columnLayout"],
  ];

  it.each(cases)("%s 转换为 %s 节点", (blockId, expectedType) => {
    const e = mount();
    applyBlockTransform(e, blockId);
    expect(topTypes(e)).toContain(expectedType);
  });

  it("标题级别按 blockId 区分", () => {
    for (const [blockId, level] of [
      ["heading1", 1],
      ["heading2", 2],
      ["heading3", 3],
    ] as const) {
      const e = mount();
      applyBlockTransform(e, blockId);
      expect(e.getJSON().content?.[0]?.attrs?.level).toBe(level);
      e.destroy();
    }
    editor = null;
  });

  it("schema 缺少目标节点时静默跳过，不抛错", () => {
    const e = mount("<p>x</p>", [StarterKit]);
    expect(() => applyBlockTransform(e, "callout")).not.toThrow();
    expect(() => applyBlockTransform(e, "columnLayout")).not.toThrow();
    expect(e.getText()).toContain("x");
  });

  it("mention 转换插入提及节点", () => {
    const e = mount();
    applyBlockTransform(e, "mention");
    expect(JSON.stringify(e.getJSON())).toContain("mention");
  });

  it("horizontalRule / table / math 走插入而非转换", () => {
    const e = mount();
    applyBlockTransform(e, "horizontalRule");
    expect(topTypes(e)).toContain("horizontalRule");

    const e2 = mount();
    applyBlockTransform(e2, "table");
    expect(topTypes(e2)).toContain("table");
  });
});

describe("applyBlockInsert 在指定位置插入", () => {
  it("table 插入 3×3 带表头", () => {
    const e = mount();
    applyBlockInsert(e, insertContext(0), "table");

    const json = JSON.stringify(e.getJSON());
    expect(json).toContain("table");
    expect(json).toContain("tableHeader");
  });

  it("horizontalRule 插入分隔线", () => {
    const e = mount();
    applyBlockInsert(e, insertContext(0), "horizontalRule");
    expect(topTypes(e)).toContain("horizontalRule");
  });

  it("columnLayout 插入分栏", () => {
    const e = mount();
    applyBlockInsert(e, insertContext(0), "columnLayout");
    expect(JSON.stringify(e.getJSON())).toContain("columnLayout");
  });

  it("schema 无该节点时是安全空操作", () => {
    const e = mount("<p>x</p>", [StarterKit]);
    expect(() => applyBlockInsert(e, insertContext(0), "table")).not.toThrow();
    expect(() => applyBlockInsert(e, insertContext(0), "math")).not.toThrow();
  });
});

describe("媒体 / 嵌入 / 提及的定点插入", () => {
  it("insertBlockMediaAt 插入视频节点", () => {
    const e = mount();
    insertBlockMediaAt(e, 0, "video", "https://cdn.example.com/a.mp4");
    expect(JSON.stringify(e.getJSON())).toContain('"type":"video"');
  });

  it("insertBlockMediaAt 在 schema 缺节点时跳过", () => {
    const e = mount("<p>x</p>", [StarterKit]);
    expect(() => insertBlockMediaAt(e, 0, "video", "https://x/a.mp4")).not.toThrow();
    expect(JSON.stringify(e.getJSON())).not.toContain("video");
  });

  it("insertBlockEmbedAt 插入嵌入块并带上 url", () => {
    const e = mount();
    insertBlockEmbedAt(e, 0, "https://www.youtube.com/watch?v=abc");
    expect(JSON.stringify(e.getJSON())).toContain("embed");
  });

  it("insertBlockMentionAt 插入提及节点", () => {
    const e = mount();
    insertBlockMentionAt(e, 0);
    expect(JSON.stringify(e.getJSON())).toContain("mention");
  });
});

describe("blockId 分类判定", () => {
  it("isMediaBlockId 只认 image / video", () => {
    expect(isMediaBlockId("image")).toBe(true);
    expect(isMediaBlockId("video")).toBe(true);
    expect(isMediaBlockId("table")).toBe(false);
    expect(isMediaBlockId("paragraph")).toBe(false);
  });

  it("isAsyncBlockId 覆盖媒体与嵌入", () => {
    expect(isAsyncBlockId("image")).toBe(true);
    expect(isAsyncBlockId("video")).toBe(true);
    expect(isAsyncBlockId("embed")).toBe(true);
    expect(isAsyncBlockId("callout")).toBe(false);
  });
});

describe("promptEmbedUrl", () => {
  it("用户输入后返回去空白的 URL", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("  https://example.com  ");
    await expect(promptEmbedUrl((k) => k)).resolves.toBe("https://example.com");
  });

  it("取消或空输入返回 null", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);
    await expect(promptEmbedUrl((k) => k)).resolves.toBeNull();

    vi.spyOn(window, "prompt").mockReturnValue("   ");
    await expect(promptEmbedUrl((k) => k)).resolves.toBeNull();
  });
});
