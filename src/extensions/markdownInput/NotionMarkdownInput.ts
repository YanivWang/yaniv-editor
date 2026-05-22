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
        find: /^\[\s?x\s?\]\s$/i,
        handler: ({ chain, range }) => {
          chain().deleteRange(range).toggleTaskList().run();
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
