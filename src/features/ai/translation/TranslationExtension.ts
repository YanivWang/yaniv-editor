import { Extension } from "@tiptap/core";

import { showEditorNotice } from "@/core/overlayFeedback";
import {
  createConfiguredAiClient,
  localeText,
  type AiExtensionConfigureOptions,
} from "@/features/ai/shared/extensionOptions";
import { preventCommandAutoDispatch } from "@/features/ai/shared/preventCommandAutoDispatch";
import { runAiSuggestionStream } from "@/features/ai/shared/runAiSuggestionStream";

import { currentTranslateLang } from "./translateStore";

export interface TranslationOptions extends AiExtensionConfigureOptions {
  defaultTargetLang?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    translation: {
      translate: (targetLang?: string) => ReturnType;
    };
  }
}

export const TranslationExtension = Extension.create<TranslationOptions>({
  name: "translation",

  addOptions() {
    return {
      defaultTargetLang: "英文",
    };
  },

  addCommands() {
    return {
      translate:
        (targetLang?: string) =>
        ({ state, editor, tr }) => {
          const { selection } = state;
          const { from, to } = selection;
          const selectedText = state.doc.textBetween(from, to, " ");

          if (!selectedText.trim()) {
            showEditorNotice(editor, {
              message: localeText(this.options, "editor.pleaseSelectText"),
              description: localeText(this.options, "editor.translateRequiresSelection"),
              kind: "warning",
              duration: 3,
            });
            return false;
          }

          const lang =
            targetLang || currentTranslateLang.value || this.options.defaultTargetLang || "英文";

          preventCommandAutoDispatch(tr);
          const client = createConfiguredAiClient(this.options);
          runAiSuggestionStream(
            editor,
            selectedText,
            { from, to },
            (content, sysPrompt, callbacks) =>
              client.translate(content, lang, sysPrompt, callbacks),
            localeText(this.options, "messages.translationFailed"),
          );

          return true;
        },
    };
  },
});
