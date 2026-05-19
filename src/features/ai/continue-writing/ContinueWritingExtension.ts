import { Extension } from "@tiptap/core";
import { notification } from "ant-design-vue";

import { aiClient } from "@/features/ai/client";
import { aiSuggestionManager } from "@/features/ai/shared/aiSuggestionManager";
import { buildDocumentContextPrompt } from "@/features/ai/shared/runAiSuggestionStream";
import { t } from "@/locales";

export type ContinueWritingOptions = Record<string, never>;

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

          aiSuggestionManager.showContinueWriting(
            editor,
            selectedText,
            contextRange,
            insertPosition,
          );

          let accumulated = "";
          aiClient.continueWriting(selectedText, buildDocumentContextPrompt(editor), {
            onStart: () => {
              accumulated = "";
            },
            onToken: (token) => {
              if (!token) return;
              accumulated += token;
              aiSuggestionManager.updateSuggestion(accumulated);
            },
            onComplete: () => {
              aiSuggestionManager.stopStreaming();
              aiSuggestionManager.updateSuggestion(accumulated);
            },
            onError: (error) => {
              console.error("[Continue Writing]", error);
              aiSuggestionManager.hide();
              notification.error({
                message: t("editor.continueWriting"),
                description: error.message,
                duration: 3,
                placement: "topRight",
              });
            },
          });

          return true;
        },
    };
  },
});
