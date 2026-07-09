import { Extension } from "@tiptap/core";

import { showEditorNotice } from "@/core/overlayFeedback";
import {
  createConfiguredAiClient,
  localeText,
  type AiExtensionConfigureOptions,
} from "@/features/ai/shared/extensionOptions";
import { preventCommandAutoDispatch } from "@/features/ai/shared/preventCommandAutoDispatch";
import { runAiSuggestionStream } from "@/features/ai/shared/runAiSuggestionStream";

export type SummarizeOptions = AiExtensionConfigureOptions;

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
        ({ state, editor, tr }) => {
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
            showEditorNotice(editor, {
              message: localeText(this.options, "editor.pleaseSelectText"),
              description: localeText(this.options, "editor.summarizeRequiresSelection"),
              kind: "warning",
              duration: 3,
            });
            return false;
          }

          preventCommandAutoDispatch(tr);
          const client = createConfiguredAiClient(this.options);
          runAiSuggestionStream(
            editor,
            selectedText,
            summaryRange,
            client.summarize.bind(client),
            localeText(this.options, "messages.summarizeFailed"),
          );
          return true;
        },
    };
  },
});
