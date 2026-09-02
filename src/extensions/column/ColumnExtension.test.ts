/**
 * 分栏插入的列数与结构。
 *
 * 此前 `setColumnLayout` 先用 `schema.nodes.column.create()` 造了一批节点，
 * 却只拿它们的**长度**去 map 出 JSON——造出来的节点被整批丢弃。
 */
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { Column, ColumnLayout } from "./ColumnExtension";

describe("setColumnLayout", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const make = (extensions = [StarterKit, Column, ColumnLayout]) => {
    const el = document.createElement("div");
    document.body.append(el);
    editor = new Editor({ element: el, extensions, content: "<p></p>" });
    return editor;
  };

  const columnCount = (e: Editor): number => {
    let n = 0;
    e.state.doc.descendants((node) => {
      if (node.type.name === "column") n += 1;
    });
    return n;
  };

  it("默认插入 2 栏，每栏含一个段落", () => {
    const e = make();
    e.commands.setColumnLayout();
    expect(columnCount(e)).toBe(2);
    expect(e.getHTML()).toContain('data-type="column-layout"');
    expect(e.getHTML()).toContain('data-type="column"');
  });

  it("列数钳制在 2~4", () => {
    for (const [input, expected] of [
      [1, 2],
      [3, 3],
      [4, 4],
      [9, 4],
      [-5, 2],
    ] as const) {
      const e = make();
      e.commands.setColumnLayout(input);
      expect(columnCount(e), `columns=${input}`).toBe(expected);
      e.destroy();
      editor = null;
    }
  });

  it("非有限数退回 2 栏，不产出空的 columnLayout", () => {
    const e = make();
    e.commands.setColumnLayout(Number.NaN);
    expect(columnCount(e)).toBe(2);
  });

  it("column 与 columnLayout 是同生共死的一对", () => {
    // 不注册 Column 时，ColumnLayout 的 `content: "column+"` 在 **schema 构建阶段**
    // 就会抛错——命令里的 `if (!schema.nodes.column …) return false` 因此实际不可达，
    // 它是防御性守卫而不是一条业务分支。
    const Dummy = Node.create({ name: "dummyBlock", group: "block", content: "inline*" });
    expect(() => make([StarterKit, Dummy, ColumnLayout])).toThrow(/column/);
  });
});
