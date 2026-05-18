/**
 * PasteImage Extension - 粘贴图片扩展
 * @description 支持粘贴图片功能；Office 结构化 HTML 粘贴时让给 OfficePaste/HTML 流水线
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { isOfficeHtml } from "@/extensions/office-paste/utils";

import type { EditorView } from "@tiptap/pm/view";

export const PasteImage = Extension.create({
  name: "pasteImage",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("pasteImage"),
        props: {
          handlePaste: (view: EditorView, event: ClipboardEvent) => {
            if (!view || !event.clipboardData) {
              return false;
            }

            const typed = event as ClipboardEvent & { skipInlineImagePasteFromOffice?: boolean };
            if (typed.skipInlineImagePasteFromOffice) {
              return false;
            }

            const htmlSnippet = event.clipboardData.getData("text/html") || "";
            if (htmlSnippet && isOfficeHtml(htmlSnippet)) {
              return false;
            }

            const items = Array.from(event.clipboardData.items);
            const imageItem = items.find((item) => item.type.indexOf("image") !== -1);

            if (imageItem) {
              const file = imageItem.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  if (!e.target?.result) return;

                  const src = e.target.result as string;
                  const { state, dispatch } = view;
                  const { schema } = state;

                  if (schema.nodes.image) {
                    const imageNode = schema.nodes.image.create({ src });
                    const transaction = state.tr.replaceSelectionWith(imageNode);
                    dispatch(transaction);
                  }
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
