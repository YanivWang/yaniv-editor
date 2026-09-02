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
  /**
   * 用户没选过目标语言时的默认值。默认 `"en"`。
   *
   * 语言代码（`LANGUAGE_CODES` 的 `code`）会经 `AI_PROMPTS.translate.targetLanguages`
   * 映射成展示名写进 prompt；映射里没有的值原样写入，所以直接传
   * 「日本語」这类展示名也可用。
   */
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
      defaultTargetLang: "en",
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
            targetLang || currentTranslateLang.value || this.options.defaultTargetLang || "en";

          preventCommandAutoDispatch(tr);
          const client = createConfiguredAiClient(this.options);
          runAiSuggestionStream(
            editor,
            selectedText,
            { from, to },
            (content, sysPrompt, callbacks) =>
              client.translate(content, lang, sysPrompt, callbacks),
            localeText(this.options, "messages.translationFailed"),
            this.options.getLocaleText,
            this.options.getDocumentContextLimit?.(),
          );

          return true;
        },
    };
  },
});
