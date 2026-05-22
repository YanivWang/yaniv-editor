import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export type MentionType = "page" | "user";

export interface MentionItem {
  id: string;
  label: string;
  href?: string;
  type?: MentionType;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (item: MentionItem) => ReturnType;
    };
  }
}

export const mentionPluginKey = new PluginKey("mention");

export interface MentionOptions {
  suggestionItems?: MentionItem[];
  onSuggestionChange?: (query: string, active: boolean) => void;
}

interface MentionPluginState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
}

const DEFAULT_MENTION_ITEMS: MentionItem[] = [
  { id: "page-home", label: "首页", href: "#home", type: "page" },
  { id: "page-docs", label: "文档", href: "#docs", type: "page" },
  { id: "page-roadmap", label: "路线图", href: "#roadmap", type: "page" },
  { id: "user-me", label: "我", href: "#me", type: "user" },
];

export const Mention = Node.create<MentionOptions>({
  name: "mention",

  group: "inline",

  inline: true,

  atom: true,

  selectable: false,

  addOptions() {
    return {
      suggestionItems: DEFAULT_MENTION_ITEMS,
      onSuggestionChange: undefined,
    };
  },

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      href: { default: null },
      mentionType: {
        default: "page" as MentionType,
        parseHTML: (element) =>
          (element.getAttribute("data-mention-type") as MentionType) || "page",
        renderHTML: (attributes) => ({
          "data-mention-type": attributes.mentionType,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "mention",
        class: "mention-pill",
        "data-id": node.attrs.id,
        "data-label": node.attrs.label,
        href: node.attrs.href,
      }),
      `@${node.attrs.label ?? ""}`,
    ];
  },

  addCommands() {
    return {
      insertMention:
        (item) =>
        ({ chain, state }) => {
          const pluginState = mentionPluginKey.getState(state) as MentionPluginState | undefined;
          const range = pluginState?.range;
          if (!range) {
            return chain()
              .insertContent({
                type: this.name,
                attrs: {
                  id: item.id,
                  label: item.label,
                  href: item.href ?? null,
                  mentionType: item.type ?? "page",
                },
              })
              .run();
          }

          return chain()
            .deleteRange(range)
            .insertContent({
              type: this.name,
              attrs: {
                id: item.id,
                label: item.label,
                href: item.href ?? null,
                mentionType: item.type ?? "page",
              },
            })
            .insertContent(" ")
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;

    return [
      new Plugin({
        key: mentionPluginKey,
        state: {
          init(): MentionPluginState {
            return { active: false, query: "", range: null };
          },
          apply(tr, prev, _oldState, newState): MentionPluginState {
            const meta = tr.getMeta(mentionPluginKey);
            if (meta?.deactivate) {
              return { active: false, query: "", range: null };
            }

            if (!tr.docChanged && !tr.selectionSet) return prev;

            const { selection } = newState;
            if (!selection.empty) {
              if (prev.active) return { active: false, query: "", range: null };
              return prev;
            }

            const { $from } = selection;
            const textBefore = $from.parent.textBetween(
              Math.max(0, $from.parentOffset - 40),
              $from.parentOffset,
              undefined,
              "\ufffc",
            );
            const match = textBefore.match(/(?:^|\s)@(\S*)$/);

            if (match) {
              const query = match[1];
              const from = $from.pos - query.length - 1;
              const to = $from.pos;
              return { active: true, query, range: { from, to } };
            }

            if (prev.active) return { active: false, query: "", range: null };
            return prev;
          },
        },
        view() {
          return {
            update(view) {
              const state = mentionPluginKey.getState(view.state) as MentionPluginState | undefined;
              extensionOptions.onSuggestionChange?.(state?.query ?? "", state?.active ?? false);
            },
          };
        },
      }),
    ];
  },
});

export function getMentionSuggestions(
  query: string,
  items: MentionItem[] = DEFAULT_MENTION_ITEMS,
): MentionItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => item.label.toLowerCase().includes(normalized));
}
