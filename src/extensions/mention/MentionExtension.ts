import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import type { Editor } from "@tiptap/core";

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
  /**
   * 候选项数据源。
   *
   * 写成 getter 而非数组：候选数据（宿主的页面 / 人员列表）会在运行期变化，而
   * `configure()` 是构建期一次性求值，直接存数组会让扩展闭包持有旧引用
   * （同 `BuildExtensionsCtx` 的 stale-closure 约定）。
   * 返回 `undefined` 或空数组时回退到内置占位数据 {@link DEFAULT_MENTION_ITEMS}。
   *
   * 消费方是 {@link resolveMentionItems}，内置的 `MentionSuggestionMenu` 与
   * 块菜单的「页面链接」都经它取值。
   */
  getSuggestionItems?: () => MentionItem[] | undefined;
  /** 候选状态变化回调（查询词 / 是否激活），供自建菜单驱动显隐 */
  onSuggestionChange?: (query: string, active: boolean) => void;
}

interface MentionPluginState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
}

/**
 * 内置候选项——**占位示例数据**，刻意不走 i18n：
 * 它既是菜单里的展示文案，也是插入文档后的节点 label（属于文档内容）。
 * 宿主接入真实数据请用 `YanivEditor` 的 `mention-items` prop（或直接
 * `Mention.configure({ getSuggestionItems })`），见 {@link MentionOptions.getSuggestionItems}。
 */
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
      getSuggestionItems: undefined,
      onSuggestionChange: undefined,
    };
  },

  addAttributes() {
    return {
      /**
       * `id` / `label` 一律以 `data-*` 输出，和同级的 `mentionType` 保持一致。
       *
       * 用默认的 renderHTML 会把它们原样写成 `id="..."` / `label="..."`：
       * `id` 是 HTML **全局属性**，同一个页面被提及两次就产出重复的 DOM id，
       * 且提及 id 由宿主数据决定，撞上宿主页面已有的 id 就会劫持 `getElementById`
       * 与 `:target`；`label` 则根本不是 `span` 的合法属性。二者的值又与本节点
       * `renderHTML` 里显式写的 `data-id` / `data-label` 完全重复，属于纯冗余。
       */
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) =>
          attributes.id == null ? {} : { "data-id": String(attributes.id) },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) =>
          attributes.label == null ? {} : { "data-label": String(attributes.label) },
      },
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
    // data-id / data-label / href / data-mention-type 都由 addAttributes 渲染，
    // 这里只补节点级的标识与样式类，避免同一属性存在两个来源。
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "mention",
        class: "mention-pill",
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

/**
 * 取当前编辑器实际生效的候选项：宿主注入的优先，否则内置占位数据。
 *
 * 从 `extensionManager` 现取而不是缓存：`getSuggestionItems` 是 getter，
 * 宿主换数据后下一次打开菜单就该看到新列表。
 */
export function resolveMentionItems(editor: Editor | null | undefined): MentionItem[] {
  if (!editor || editor.isDestroyed) return DEFAULT_MENTION_ITEMS;
  const extension = editor.extensionManager.extensions.find((item) => item.name === "mention");
  const items = (extension?.options as MentionOptions | undefined)?.getSuggestionItems?.();
  return items?.length ? items : DEFAULT_MENTION_ITEMS;
}

export function getMentionSuggestions(
  query: string,
  items: MentionItem[] = DEFAULT_MENTION_ITEMS,
): MentionItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => item.label.toLowerCase().includes(normalized));
}
