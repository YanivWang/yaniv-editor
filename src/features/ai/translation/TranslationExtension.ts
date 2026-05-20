import { Extension } from "@tiptap/core";
import { notification } from "ant-design-vue";

import { aiClient } from "@/features/ai/client";
import { preventCommandAutoDispatch } from "@/features/ai/shared/preventCommandAutoDispatch";
import { runAiSuggestionStream } from "@/features/ai/shared/runAiSuggestionStream";
import { t } from "@/locales";

import { currentTranslateLang } from "./translateStore";

export interface TranslationOptions {
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
            notification.warning({
              message: t("editor.pleaseSelectText"),
              description: t("editor.translateRequiresSelection"),
              duration: 3,
              placement: "topRight",
            });
            return false;
          }

          const lang =
            targetLang || currentTranslateLang.value || this.options.defaultTargetLang || "英文";

          preventCommandAutoDispatch(tr);
          runAiSuggestionStream(
            editor,
            selectedText,
            { from, to },
            (content, sysPrompt, callbacks) =>
              aiClient.translate(content, lang, sysPrompt, callbacks),
            t("messages.translationFailed"),
          );

          return true;
        },
    };
  },
});
