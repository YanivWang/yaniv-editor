/**
 * Notion 风格 markdown 输入规则。
 *
 * InputRule 只在真实键入时触发，`insertContent` 不走这条路径，
 * 所以这里直接驱动 ProseMirror 的 `handleTextInput`——那正是输入规则的入口。
 */
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it } from "vitest";

import { NotionMarkdownInput } from "./NotionMarkdownInput";

describe("NotionMarkdownInput", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  const make = () => {
    const el = document.createElement("div");
    document.body.append(el);
    editor = new Editor({
      element: el,
      extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), NotionMarkdownInput],
      content: "<p></p>",
    });
    return editor;
  };

  /** 逐字符走 handleTextInput，模拟真实键入 */
  const type = (e: Editor, text: string) => {
    for (const char of text) {
      const { from, to } = e.state.selection;
      // 第 5 个参数是 ProseMirror 传给规则的「默认事务工厂」，签名要求它必须在
      const handled = e.view.someProp("handleTextInput", (f) =>
        f(e.view, from, to, char, () => e.state.tr.insertText(char, from, to)),
      );
      if (!handled) e.view.dispatch(e.state.tr.insertText(char, from, to));
    }
  };

  const firstTaskItem = (e: Editor) => {
    let found: { checked?: unknown } | null = null;
    e.state.doc.descendants((node) => {
      if (!found && node.type.name === "taskItem") found = node.attrs;
    });
    return found as { checked?: unknown } | null;
  };

  it("`[ ] ` 产生未勾选的任务项", () => {
    const e = make();
    type(e, "[ ] ");
    expect(firstTaskItem(e), "应生成 taskItem").not.toBeNull();
    expect(firstTaskItem(e)?.checked).toBe(false);
  });

  it("`[x] ` 产生已勾选的任务项", () => {
    const e = make();
    type(e, "[x] ");
    expect(firstTaskItem(e), "应生成 taskItem").not.toBeNull();
    expect(firstTaskItem(e)?.checked).toBe(true);
  });

  it("`[X] ` 大写同样识别为已勾选", () => {
    const e = make();
    type(e, "[X] ");
    expect(firstTaskItem(e)?.checked).toBe(true);
  });

  it("`> ` 在没有 callout 时退回引用块", () => {
    const e = make();
    type(e, "> ");
    expect(e.getHTML()).toContain("<blockquote>");
  });

  it("`--- ` 产生分割线", () => {
    const e = make();
    type(e, "---");
    expect(e.getHTML()).toContain("<hr>");
  });
});
