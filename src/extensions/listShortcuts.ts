/**
 * ListShortcuts Extension - 列表快捷键扩展
 *
 * 两条绑定都跑在 tiptap 内置绑定之前（本扩展在 `core` 能力里注册得更靠后，
 * ProseMirror 的 keymap 先到先得）：
 *
 * - `Enter`：与 tiptap `ListItem` / `TaskItem` 自带的 Enter 同义，抢先执行一遍相同逻辑。
 * - `Shift-Enter`：**不能删**，代码块内靠它换行。
 *
 * 22 个场景的带 / 不带对照见 `listShortcuts.test.ts`（判定必须走真实 keydown 派发，
 * 手工模拟 keymap 调用链会漏掉代码块那两个差异）。
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
      // 代码块内换行；其余位置交还给 HardBreak。
      // 候选项必须用注入的 `commands`，写 `editor.commands.x()` 会抛
      // mismatched transaction（不变量 39）。
      "Shift-Enter": ({ editor }) =>
        editor.commands.first(({ commands }) => [
          () => commands.newlineInCode(),
          () => commands.createParagraphNear(),
        ]),
    };
  },
});
