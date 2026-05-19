/**
 * Yaniv Placeholder
 * @description 段落仅在光标所在空块显示 placeholder；标题、代码块等空块始终显示
 */
import { isNodeEmpty } from "@tiptap/core";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** 仅在有光标时显示 placeholder 的节点类型 */
const PLACEHOLDER_ON_FOCUS_TYPES = new Set(["paragraph"]);

export const YanivPlaceholder = Placeholder.extend({
  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey("placeholder"),
        props: {
          decorations: ({ doc, selection }) => {
            const active = extension.editor.isEditable || !extension.options.showOnlyWhenEditable;
            const { anchor } = selection;
            const decorations: Decoration[] = [];

            if (!active) {
              return null;
            }

            const isEmptyDoc = extension.editor.isEmpty;

            doc.descendants((node, pos) => {
              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
              const isEmpty = !node.isLeaf && isNodeEmpty(node);
              const needsFocus = PLACEHOLDER_ON_FOCUS_TYPES.has(node.type.name);
              const shouldShow = isEmpty && (needsFocus ? hasAnchor : true);

              if (shouldShow) {
                const classes = [extension.options.emptyNodeClass];

                if (isEmptyDoc) {
                  classes.push(extension.options.emptyEditorClass);
                }

                const decoration = Decoration.node(pos, pos + node.nodeSize, {
                  class: classes.join(" "),
                  "data-placeholder":
                    typeof extension.options.placeholder === "function"
                      ? extension.options.placeholder({
                          editor: extension.editor,
                          node,
                          pos,
                          hasAnchor,
                        })
                      : extension.options.placeholder,
                });

                decorations.push(decoration);
              }

              return extension.options.includeChildren;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
