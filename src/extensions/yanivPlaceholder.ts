/**
 * Yaniv Placeholder
 * @description 段落仅在光标所在空块显示 placeholder；标题、代码块等空块始终显示。
 * Notion 容器（toggle/callout/columnLayout）在内容视觉为空时，decoration 打在容器节点上。
 */
import { isNodeEmpty } from "@tiptap/core";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/** 仅在有光标时显示 placeholder 的节点类型 */
const PLACEHOLDER_ON_FOCUS_TYPES = new Set(["paragraph"]);

/** placeholder 装饰打在容器自身（配合 placeholder.css） */
const CONTAINER_PLACEHOLDER_TYPES = new Set(["toggleBlock", "callout", "columnLayout"]);

function isVisuallyEmpty(node: ProseMirrorNode): boolean {
  if (node.isLeaf) return false;
  if (isNodeEmpty(node)) return true;
  if (!CONTAINER_PLACEHOLDER_TYPES.has(node.type.name)) return false;

  let empty = true;
  node.forEach((child) => {
    if (child.isTextblock) {
      if (child.content.size > 0) empty = false;
      return;
    }
    if (!isVisuallyEmpty(child)) empty = false;
  });
  return empty;
}

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
              const isEmpty = isVisuallyEmpty(node);
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
