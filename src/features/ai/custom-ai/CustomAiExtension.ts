import { Extension } from "@tiptap/core";

import { showEditorNotice } from "@/core/overlayFeedback";
import { aiSuggestionManager } from "@/features/ai/shared/aiSuggestionManager";
import {
  createConfiguredAiClient,
  localeText,
  type AiExtensionConfigureOptions,
} from "@/features/ai/shared/extensionOptions";
import { preventCommandAutoDispatch } from "@/features/ai/shared/preventCommandAutoDispatch";

export type CustomAiOptions = AiExtensionConfigureOptions;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customAi: {
      customAi: () => ReturnType;
    };
  }
}

export const CustomAiExtension = Extension.create<CustomAiOptions>({
  name: "customAi",

  addCommands() {
    return {
      customAi:
        () =>
        ({ state, editor, tr }) => {
          const { selection } = state;
          const { from, to } = selection;
          const selectedText = state.doc.textBetween(from, to, " ");

          if (!selectedText.trim()) {
            showEditorNotice(editor, {
              message: localeText(this.options, "editor.pleaseSelectText"),
              description: localeText(this.options, "editor.customAiRequiresSelection"),
              kind: "warning",
              duration: 2,
            });
            return false;
          }

          preventCommandAutoDispatch(tr);
          aiSuggestionManager.showCustom(
            editor,
            selectedText,
            { from, to },
            createConfiguredAiClient(this.options),
          );
          return true;
        },
    };
  },
});
