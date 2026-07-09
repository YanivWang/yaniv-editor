import { Extension } from "@tiptap/core";

import { showEditorNotice } from "@/core/overlayFeedback";
import {
  createConfiguredAiClient,
  localeText,
  type AiExtensionConfigureOptions,
} from "@/features/ai/shared/extensionOptions";
import { preventCommandAutoDispatch } from "@/features/ai/shared/preventCommandAutoDispatch";
import { runAiContinueWritingStream } from "@/features/ai/shared/runAiSuggestionStream";

export type ContinueWritingOptions = AiExtensionConfigureOptions;

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
        ({ state, editor, tr }) => {
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
            showEditorNotice(editor, {
              message: localeText(this.options, "editor.pleaseSelectText"),
              description: localeText(this.options, "editor.continueWritingRequiresSelection"),
              kind: "warning",
              duration: 2,
            });
            return false;
          }

          preventCommandAutoDispatch(tr);
          const client = createConfiguredAiClient(this.options);
          runAiContinueWritingStream(
            editor,
            selectedText,
            contextRange,
            insertPosition,
            localeText(this.options, "messages.continueWritingFailed"),
            client,
          );
          return true;
        },
    };
  },
});
