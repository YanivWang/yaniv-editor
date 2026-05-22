import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggleBlock: () => ReturnType;
      toggleToggleOpen: () => ReturnType;
    };
  }
}

export const ToggleBlock = Node.create({
  name: "toggleBlock",

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
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "toggle-block";
      dom.dataset.type = "toggle";
      dom.dataset.open = node.attrs.open ? "true" : "false";

      const chevron = document.createElement("button");
      chevron.type = "button";
      chevron.className = "toggle-block__chevron";
      chevron.setAttribute("aria-label", "Toggle");
      chevron.innerHTML =
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      const contentDOM = document.createElement("div");
      contentDOM.className = "toggle-block__content";

      const syncOpen = (open: boolean) => {
        dom.dataset.open = open ? "true" : "false";
        chevron.classList.toggle("is-open", open);
      };

      syncOpen(node.attrs.open);

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
        update(updatedNode) {
          if (updatedNode.type.name !== "toggleBlock") return false;
          syncOpen(updatedNode.attrs.open);
          return true;
        },
      };
    };
  },
});
