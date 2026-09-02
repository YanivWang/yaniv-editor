/**
 * ListShortcuts Extension - 列表快捷键扩展
 *
 * **这两条绑定都跑在 tiptap 内置绑定之前**（本扩展在 `core` 能力里注册得更靠后，
 * ProseMirror 的 keymap 按 plugin 顺序先到先得）。实测两个 handler 都确实被调用，
 * 但目前都没有改变最终行为：
 *
 * - `Enter`：调 `splitListItem`，与 tiptap `ListItem` / `TaskItem` 自带的 Enter 同义，
 *   属于重复实现——摘掉本扩展，列表与任务项的回车拆分行为一模一样（实测三种场景）。
 * - `Shift-Enter`：`newlineInCode` 只在代码块内可能成功，`createParagraphNear` 在文本
 *   中间会失败，因此在段落 / 列表项 / 任务项里 handler 都返回 false，
 *   最终由 tiptap 的 `HardBreak` 插入 `<br>`。
 *
 * 保留而不是删除：上面只覆盖了三种常见场景，嵌套列表、代码块内等路径没有逐一验证，
 * 而它确实参与了按键处理链——删掉属于没有证据的改动。
 */

import { Extension } from "@tiptap/core";

export const ListShortcuts = Extension.create({
  name: "listShortcuts",

  addKeyboardShortcuts() {
    return {
      // 列表项 / 任务项内回车拆分为新项
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.node(-1)?.type.name === "taskItem") {
          return editor.commands.splitListItem("taskItem");
        }
        if ($from.node(-1)?.type.name === "listItem") {
          return editor.commands.splitListItem("listItem");
        }
        return false;
      },
      // 代码块内换行；其余位置交还给 HardBreak
      "Shift-Enter": ({ editor }) => {
        return editor.commands.first([
          () => editor.commands.newlineInCode(),
          () => editor.commands.createParagraphNear(),
        ]);
      },
    };
  },
});
