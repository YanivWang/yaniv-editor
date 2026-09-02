import { Node, mergeAttributes } from "@tiptap/core";

import { createNodeDecorationApplier } from "@/extensions/shared/nodeViewDecorations";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggleBlock: () => ReturnType;
      toggleToggleOpen: () => ReturnType;
    };
  }
}

export interface ToggleBlockOptions {
  /** 实例 locale 文案，key 为 dot-path；扩展拿不到 Vue inject，同 DragHandle 的约定 */
  getLocaleText?: (key: string) => string;
}

export const ToggleBlock = Node.create<ToggleBlockOptions>({
  name: "toggleBlock",

  addOptions() {
    return { getLocaleText: undefined };
  },

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({
          "data-open": attributes.open ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "toggle",
        class: "toggle-block",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setToggleBlock:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { open: true },
              content: [{ type: "paragraph" }],
            })
            .run(),
      toggleToggleOpen:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          for (let depth = $from.depth; depth >= 1; depth -= 1) {
            const node = $from.node(depth);
            if (node.type.name !== this.name) continue;
            const pos = $from.before(depth);
            if (!dispatch) return true;
            dispatch(
              state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                open: !node.attrs.open,
              }),
            );
            return true;
          }
          return false;
        },
    };
  },

  addNodeView() {
    const chevronLabel =
      this.options.getLocaleText?.("slashCommand.toggleBlock") ?? "slashCommand.toggleBlock";

    return ({ node, getPos, editor, decorations }) => {
      const dom = document.createElement("div");
      dom.className = "toggle-block";
      dom.dataset.type = "toggle";

      const chevron = document.createElement("button");
      chevron.type = "button";
      chevron.className = "toggle-block__chevron";
      chevron.setAttribute("aria-label", chevronLabel);
      chevron.innerHTML =
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      const contentDOM = document.createElement("div");
      contentDOM.className = "toggle-block__content";

      const syncOpen = (open: boolean) => {
        dom.dataset.open = open ? "true" : "false";
        // 折叠块是 disclosure 控件：展开态必须经 aria-expanded 播报，光有图标旋转读屏读不出来
        chevron.setAttribute("aria-expanded", open ? "true" : "false");
        chevron.classList.toggle("is-open", open);
      };

      /*
       * 空态 placeholder 不自算：`YanivPlaceholder` 已经把 `is-empty` + `data-placeholder`
       * 作为节点装饰打在容器上（`CONTAINER_PLACEHOLDER_TYPES` 含 toggleBlock），
       * 这里照 callout 的做法直接消费装饰，避免同一份判断存在两套实现。
       */
      const applyDecorations = createNodeDecorationApplier(dom);

      syncOpen(node.attrs.open);
      applyDecorations(decorations);

      chevron.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });

      chevron.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos == null) return;
        const current = editor.state.doc.nodeAt(pos);
        if (!current) return;
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...current.attrs,
            open: !current.attrs.open,
          }),
        );
      });

      dom.appendChild(chevron);
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
        ignoreMutation: (mutation) =>
          mutation.type === "attributes" &&
          (mutation.attributeName === "class" || mutation.attributeName === "data-placeholder"),
        update(updatedNode, updatedDecorations) {
          if (updatedNode.type.name !== "toggleBlock") return false;
          syncOpen(updatedNode.attrs.open);
          applyDecorations(updatedDecorations);
          return true;
        },
      };
    };
  },
});
