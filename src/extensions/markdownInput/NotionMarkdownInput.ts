import { Extension, InputRule } from "@tiptap/core";

/**
 * Notion-style markdown input rules for block types not covered by StarterKit defaults.
 */
export const NotionMarkdownInput = Extension.create({
  name: "notionMarkdownInput",

  addInputRules() {
    return [
      new InputRule({
        find: /^\[\s?\]\s$/,
        handler: ({ chain, range }) => {
          chain().deleteRange(range).toggleTaskList().run();
        },
      }),
      new InputRule({
        // `[x] ` 是**已勾选**的任务项——此前与 `[ ] ` 用的是逐字相同的 handler，
        // 于是输入 `[x] ` 得到的是一个未勾选的空任务项，勾选状态被丢掉了。
        find: /^\[\s?x\s?\]\s$/i,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange(range)
            .toggleTaskList()
            .updateAttributes("taskItem", { checked: true })
            .run();
        },
      }),
      new InputRule({
        find: /^>\s$/,
        handler: ({ chain, range, state }) => {
          if (state.schema.nodes.callout) {
            chain().deleteRange(range).setCallout().run();
            return;
          }
          chain().deleteRange(range).toggleBlockquote().run();
        },
      }),
      new InputRule({
        find: /^---$/,
        handler: ({ chain, range }) => {
          chain().deleteRange(range).setHorizontalRule().run();
        },
      }),
    ];
  },
});
