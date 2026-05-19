import { Extension } from "@tiptap/core";
import { notification } from "ant-design-vue";

import { aiSuggestionStreams } from "@/features/ai/shared/runAiSuggestionStream";
import { t } from "@/locales";

export type SummarizeOptions = Record<string, never>;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    summarize: {
      summarize: () => ReturnType;
    };
  }
}

export const SummarizeExtension = Extension.create<SummarizeOptions>({
  name: "summarize",

  addCommands() {
    return {
      summarize:
        () =>
        ({ state, editor }) => {
          const { selection } = state;
          const { from, to } = selection;
          let selectedText = state.doc.textBetween(from, to, " ");
          let summaryRange = { from, to };

          if (!selectedText.trim()) {
            const docSize = state.doc.content.size;
            selectedText = state.doc.textBetween(0, docSize, " ").trim();
            summaryRange = { from: 0, to: docSize };
          }

          if (!selectedText.trim()) {
            notification.warning({
              message: t("editor.pleaseSelectText"),
              description: t("editor.summarizeRequiresSelection"),
              duration: 3,
              placement: "topRight",
            });
            return false;
          }

          aiSuggestionStreams.summarize(editor, selectedText, summaryRange);
          return true;
        },
    };
  },
});
