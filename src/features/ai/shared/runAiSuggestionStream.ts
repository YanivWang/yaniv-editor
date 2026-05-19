import { notification } from "ant-design-vue";

import { aiClient } from "../client";

import { removeAiHighlight } from "./AiHighlightMark";
import { aiSuggestionManager } from "./aiSuggestionManager";

import type { AiStreamCallbacks } from "../types";
import type { Editor } from "@tiptap/core";

type StreamInvoker = (
  content: string,
  sysPrompt: string,
  callbacks: AiStreamCallbacks,
) => void;

export function buildDocumentContextPrompt(editor: Editor): string {
  const fullText = editor.state.doc.textBetween(0, editor.state.doc.content.size, " ");
  return `以下係完整嘅文件內容:\n\n${fullText}`;
}

/**
 * 在选区上展示 AI 建议气泡，并以流式方式更新内容（润色 / 摘要 / 翻译等共用）
 */
export function runAiSuggestionStream(
  editor: Editor,
  selectedText: string,
  originalSelection: { from: number; to: number },
  stream: StreamInvoker,
  errorTitle: string,
): void {
  removeAiHighlight(editor);
  aiSuggestionManager.show(selectedText, originalSelection, editor);

  const sysPrompt = buildDocumentContextPrompt(editor);
  let accumulatedContent = "";

  stream(selectedText, sysPrompt, {
    onStart: () => {
      accumulatedContent = "";
    },
    onToken: (token: string) => {
      if (!token) return;
      accumulatedContent += token;
      aiSuggestionManager.updateSuggestion(accumulatedContent);
    },
    onComplete: () => {
      aiSuggestionManager.stopStreaming();
      aiSuggestionManager.updateSuggestion(accumulatedContent);
    },
    onError: (error: Error) => {
      console.error(`[${errorTitle}]`, error);
      aiSuggestionManager.hide();
      notification.error({
        message: errorTitle,
        description: error.message,
        duration: 3,
        placement: "topRight",
      });
    },
  });
}

export const aiSuggestionStreams = {
  polish: (
    editor: Editor,
    selectedText: string,
    selection: { from: number; to: number },
  ) =>
    runAiSuggestionStream(
      editor,
      selectedText,
      selection,
      aiClient.polish.bind(aiClient),
      "润色失败",
    ),
  summarize: (
    editor: Editor,
    selectedText: string,
    selection: { from: number; to: number },
  ) =>
    runAiSuggestionStream(
      editor,
      selectedText,
      selection,
      aiClient.summarize.bind(aiClient),
      "总结失败",
    ),
};
