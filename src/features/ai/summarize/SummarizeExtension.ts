import { Extension } from "@tiptap/core";
import { notification } from "ant-design-vue";

import { aiClient } from "@/features/ai/client";
import { t } from "@/locales";

import { aiSuggestionManager } from "../shared/aiSuggestionManager";

import type { Editor } from "@tiptap/core";

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

          // 无选区时总结全文
          if (!selectedText.trim()) {
            const docSize = state.doc.content.size;
            selectedText = state.doc.textBetween(0, docSize, " ").trim();
            summaryRange = { from: 0, to: docSize };
          }

          if (!selectedText.trim()) {
            console.warn("[Summarize] No text to summarize");
            notification.warning({
              message: t("editor.pleaseSelectText"),
              description: t("editor.summarizeRequiresSelection"),
              duration: 3,
              placement: "topRight",
            });
            return false;
          }

          performSummarize(editor, selectedText, summaryRange);
          return true;
        },
    };
  },
});

function performSummarize(
  editor: Editor,
  selectedText: string,
  originalSelection: { from: number; to: number },
) {
  let accumulatedContent = "";

  // Show AI suggestion popover with highlight
  aiSuggestionManager.show(selectedText, originalSelection, editor);

  // Get full document context for system prompt
  const state = editor.state;
  const fullText = state.doc.textBetween(0, state.doc.content.size, " ");
  const sysPrompt = `以下係完整嘅文件內容:\n\n${fullText}`;

  const callback = {
    onStart: () => {
      accumulatedContent = "";
    },
    onToken: (token: string) => {
      if (token) {
        accumulatedContent += token;
        // Update the suggestion in popover
        aiSuggestionManager.updateSuggestion(accumulatedContent);
      }
    },
    onComplete: () => {
      try {
        // Stop streaming indicator
        aiSuggestionManager.stopStreaming();

        // Update with final content
        aiSuggestionManager.updateSuggestion(accumulatedContent);
      } catch (error) {
        console.warn("[Summarize] Failed to finalize formatting:", error);
      }
    },
    onError: (error: Error) => {
      console.error("[Summarize] Error:", error);
      aiSuggestionManager.hide();
      notification.error({
        message: "总结失败",
        description: error.message || t("messages.networkError"),
        duration: 3,
      });
    },
  };

  aiClient.summarize(selectedText, sysPrompt, callback);
}
