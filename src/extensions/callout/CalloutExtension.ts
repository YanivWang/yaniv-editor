import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutColor =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { icon?: string; color?: CalloutColor }) => ReturnType;
      toggleCallout: (attrs?: { icon?: string; color?: CalloutColor }) => ReturnType;
    };
  }
}

const CALLOUT_ICONS: Record<CalloutColor, string> = {
  default: "💡",
  gray: "💬",
  brown: "📦",
  orange: "⚠️",
  yellow: "⭐",
  green: "✅",
  blue: "ℹ️",
  purple: "🔮",
  pink: "🌸",
  red: "🚨",
};

export const Callout = Node.create({
  name: "callout",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      icon: {
        default: "💡",
        parseHTML: (element) => element.getAttribute("data-icon") || "💡",
        renderHTML: (attributes) => ({
          "data-icon": attributes.icon,
        }),
      },
      color: {
        default: "default" as CalloutColor,
        parseHTML: (element) => (element.getAttribute("data-color") as CalloutColor) || "default",
        renderHTML: (attributes) => ({
          "data-color": attributes.color,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: "callout-block",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                icon: attrs?.icon ?? CALLOUT_ICONS[attrs?.color ?? "default"],
                color: attrs?.color ?? "default",
              },
              content: [{ type: "paragraph" }],
            })
            .run(),
      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, {
            icon: attrs?.icon ?? CALLOUT_ICONS[attrs?.color ?? "default"],
            color: attrs?.color ?? "default",
          }),
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, decorations }) => {
      const dom = document.createElement("div");
      dom.className = "callout-block";
      dom.dataset.type = "callout";
      dom.dataset.color = node.attrs.color;
      dom.dataset.icon = node.attrs.icon;

      const icon = document.createElement("span");
      icon.className = "callout-block__icon";
      icon.textContent = node.attrs.icon;
      icon.contentEditable = "false";

      const contentDOM = document.createElement("div");
      contentDOM.className = "callout-block__content";

      const applyDecorations = (decoList: typeof decorations) => {
        let extraClass = "";
        let placeholder: string | null = null;
        decoList.forEach((deco) => {
          const attrs = (deco as { type?: { attrs?: Record<string, string> } }).type?.attrs;
          if (!attrs) return;
          if (attrs.class) extraClass = `${extraClass} ${attrs.class}`.trim();
          if (attrs["data-placeholder"]) placeholder = attrs["data-placeholder"];
        });
        dom.className = extraClass ? `callout-block ${extraClass}` : "callout-block";
        if (placeholder) dom.setAttribute("data-placeholder", placeholder);
        else dom.removeAttribute("data-placeholder");
      };

      dom.appendChild(icon);
      dom.appendChild(contentDOM);

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (key === "class" || value == null) return;
        dom.setAttribute(key, String(value));
      });
      applyDecorations(decorations);

      return {
        dom,
        contentDOM,
        ignoreMutation: (mutation) =>
          mutation.type === "attributes" &&
          (mutation.attributeName === "class" || mutation.attributeName === "data-placeholder"),
        update(updatedNode, updatedDecorations) {
          if (updatedNode.type.name !== "callout") return false;
          dom.dataset.color = updatedNode.attrs.color;
          dom.dataset.icon = updatedNode.attrs.icon;
          icon.textContent = updatedNode.attrs.icon;
          applyDecorations(updatedDecorations);
          return true;
        },
      };
    };
  },
});
