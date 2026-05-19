import { Extension } from "@tiptap/core";
import { notification } from "ant-design-vue";

import { aiSuggestionManager } from "@/features/ai/shared/aiSuggestionManager";
import { t } from "@/locales";

export type CustomAiOptions = Record<string, never>;

export const CustomAiExtension = Extension.create<CustomAiOptions>({
  name: "customAi",

  addCommands() {
    return {
      customAi:
        () =>
        ({ state, editor }) => {
          const { selection } = state;
          const { from, to } = selection;
          const selectedText = state.doc.textBetween(from, to, " ");

          if (!selectedText.trim()) {
            notification.warning({
              message: t("editor.pleaseSelectText"),
              description: t("editor.customAiRequiresSelection"),
              duration: 2,
              placement: "topRight",
            });
            return false;
          }

          aiSuggestionManager.showCustom(editor, selectedText, { from, to });
          return true;
        },
    };
  },
});
