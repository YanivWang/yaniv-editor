import { Extension } from "@tiptap/core";
import { notification } from "ant-design-vue";

import { preventCommandAutoDispatch } from "@/features/ai/shared/preventCommandAutoDispatch";
import { aiSuggestionStreams } from "@/features/ai/shared/runAiSuggestionStream";
import { t } from "@/locales";

export type PolishOptions = Record<string, never>;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    polish: {
      polish: () => ReturnType;
    };
  }
}

export const PolishExtension = Extension.create<PolishOptions>({
  name: "polish",

  addCommands() {
    return {
      polish:
        () =>
        ({ state, editor, tr }) => {
          const { selection } = state;
          const { from, to } = selection;
          const selectedText = state.doc.textBetween(from, to, " ");

          if (!selectedText.trim()) {
            notification.warning({
              message: t("editor.pleaseSelectText"),
              description: t("editor.polishRequiresSelection"),
              duration: 2,
              placement: "topRight",
            });
            return false;
          }

          preventCommandAutoDispatch(tr);
          aiSuggestionStreams.polish(editor, selectedText, { from, to });
          return true;
        },
    };
  },
});
