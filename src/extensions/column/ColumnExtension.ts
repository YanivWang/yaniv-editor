import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnLayout: {
      setColumnLayout: (columns?: number) => ReturnType;
    };
  }
}

function createEmptyColumn(schema: import("@tiptap/pm/model").Schema) {
  return schema.nodes.column.create(null, schema.nodes.paragraph.create());
}

export const Column = Node.create({
  name: "column",

  content: "block+",

  defining: true,

  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column",
        class: "column-block",
      }),
      0,
    ];
  },
});

export const ColumnLayout = Node.create({
  name: "columnLayout",

  group: "block",

  content: "column+",

  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column-layout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column-layout",
        class: "column-layout",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setColumnLayout:
        (columns = 2) =>
        ({ chain, state }) => {
          const { schema } = state;
          if (!schema.nodes.column || !schema.nodes.columnLayout) return false;
          const count = Math.max(2, Math.min(columns, 4));
          const columnNodes = Array.from({ length: count }, () => createEmptyColumn(schema));
          return chain()
            .insertContent({
              type: this.name,
              content: columnNodes.map(() => ({
                type: "column",
                content: [{ type: "paragraph" }],
              })),
            })
            .run();
        },
    };
  },
});
