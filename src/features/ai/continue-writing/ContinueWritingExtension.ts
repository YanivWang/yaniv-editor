import { Extension } from "@tiptap/core";
import { notification } from "ant-design-vue";

import { runAiContinueWritingStream } from "@/features/ai/shared/runAiSuggestionStream";
import { t } from "@/locales";

export type ContinueWritingOptions = Record<string, never>;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    continueWriting: {
      continueWriting: () => ReturnType;
    };
  }
}

export const ContinueWritingExtension = Extension.create<ContinueWritingOptions>({
  name: "continueWriting",

  addCommands() {
    return {
      continueWriting:
        () =>
        ({ state, editor }) => {
          const { selection } = state;
          const { from, to } = selection;

          let selectedText = state.doc.textBetween(from, to, " ");
          let contextRange = { from, to };
          let insertPosition = to;

          if (!selectedText.trim() && from === to) {
            const blockStart = selection.$from.start();
            selectedText = state.doc.textBetween(blockStart, from, " ").trim();
            contextRange = { from: blockStart, to: from };
            insertPosition = from;
          }

          if (!selectedText.trim()) {
            notification.warning({
              message: t("editor.pleaseSelectText"),
              description: t("editor.continueWritingRequiresSelection"),
              duration: 2,
              placement: "topRight",
            });
            return false;
          }

          runAiContinueWritingStream(
            editor,
            selectedText,
            contextRange,
            insertPosition,
            t("editor.continueWriting"),
          );

          return true;
        },
    };
  },
});
