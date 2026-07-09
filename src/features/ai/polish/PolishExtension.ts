import { Extension } from "@tiptap/core";

import { showEditorNotice } from "@/core/overlayFeedback";
import {
  createConfiguredAiClient,
  localeText,
  type AiExtensionConfigureOptions,
} from "@/features/ai/shared/extensionOptions";
import { preventCommandAutoDispatch } from "@/features/ai/shared/preventCommandAutoDispatch";
import { runAiSuggestionStream } from "@/features/ai/shared/runAiSuggestionStream";

export type PolishOptions = AiExtensionConfigureOptions;

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
            showEditorNotice(editor, {
              message: localeText(this.options, "editor.pleaseSelectText"),
              description: localeText(this.options, "editor.polishRequiresSelection"),
              kind: "warning",
              duration: 2,
            });
            return false;
          }

          preventCommandAutoDispatch(tr);
          const client = createConfiguredAiClient(this.options);
          runAiSuggestionStream(
            editor,
            selectedText,
            { from, to },
            client.polish.bind(client),
            localeText(this.options, "messages.polishFailed"),
          );
          return true;
        },
    };
  },
});
