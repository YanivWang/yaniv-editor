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
    return ({ node, HTMLAttributes }) => {
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

      dom.appendChild(icon);
      dom.appendChild(contentDOM);

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value != null) dom.setAttribute(key, String(value));
      });

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type.name !== "callout") return false;
          dom.dataset.color = updatedNode.attrs.color;
          dom.dataset.icon = updatedNode.attrs.icon;
          icon.textContent = updatedNode.attrs.icon;
          return true;
        },
      };
    };
  },
});
