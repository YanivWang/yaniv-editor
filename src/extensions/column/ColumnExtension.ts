import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnLayout: {
      setColumnLayout: (columns?: number) => ReturnType;
    };
  }
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
          // 防御性守卫，实际不可达：`content: "column+"` 让这两个节点同生共死——
          // 少注册一个，schema 构建阶段就会抛 `No node type or group 'column' found`，
          // 根本走不到这条命令。
          if (!schema.nodes.column || !schema.nodes.columnLayout) return false;
          // 列数钳制在 2~4；`insertContent` 走 JSON，节点由 schema 自行构造
          const count = Number.isFinite(columns) ? Math.max(2, Math.min(columns, 4)) : 2;
          return chain()
            .insertContent({
              type: this.name,
              content: Array.from({ length: count }, () => ({
                type: "column",
                content: [{ type: "paragraph" }],
              })),
            })
            .run();
        },
    };
  },
});
