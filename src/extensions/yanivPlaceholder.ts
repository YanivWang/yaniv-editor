/**
 * Yaniv Placeholder
 * @description 段落仅在光标所在空块显示 placeholder；标题、代码块等空块始终显示。
 * Notion 容器（toggle/callout/columnLayout）在内容视觉为空时，decoration 打在容器节点上。
 */
import { Placeholder } from "@tiptap/extension-placeholder";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { CONTAINER_PLACEHOLDER_TYPES, isVisuallyEmpty } from "@/extensions/shared/isVisuallyEmpty";

/** 仅在有光标时显示 placeholder 的节点类型 */
const PLACEHOLDER_ON_FOCUS_TYPES = new Set(["paragraph"]);

export const YanivPlaceholder = Placeholder.extend({
  addProseMirrorPlugins() {
    const { editor, options } = this;

    return [
      new Plugin({
        key: new PluginKey("placeholder"),
        props: {
          decorations: ({ doc, selection }) => {
            const active = editor.isEditable || !options.showOnlyWhenEditable;
            const { anchor } = selection;
            const decorations: Decoration[] = [];

            if (!active) {
              return null;
            }

            const isEmptyDoc = editor.isEmpty;

            doc.descendants((node, pos) => {
              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
              const isEmpty = isVisuallyEmpty(node, CONTAINER_PLACEHOLDER_TYPES);
              const needsFocus = PLACEHOLDER_ON_FOCUS_TYPES.has(node.type.name);
              const shouldShow = isEmpty && (needsFocus ? hasAnchor : true);

              if (shouldShow) {
                const classes = [options.emptyNodeClass];

                if (isEmptyDoc) {
                  classes.push(options.emptyEditorClass);
                }

                const decoration = Decoration.node(pos, pos + node.nodeSize, {
                  class: classes.join(" "),
                  "data-placeholder":
                    typeof options.placeholder === "function"
                      ? options.placeholder({
                          editor,
                          node,
                          pos,
                          hasAnchor,
                        })
                      : options.placeholder,
                });

                decorations.push(decoration);
              }

              return options.includeChildren;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
