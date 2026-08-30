import { showEditorNotice } from "@/core/overlayFeedback";
import type { createAiClient } from "@/features/ai/client";

import { removeAiHighlight } from "./AiHighlightMark";
import { aiSuggestionManager } from "./aiSuggestionManager";
import { buildDocumentContextPrompt } from "./documentContext";

import type { AiStreamCallbacks } from "../types";
import type { Editor } from "@tiptap/core";

type StreamInvoker = (content: string, sysPrompt: string, callbacks: AiStreamCallbacks) => void;
type AiClient = ReturnType<typeof createAiClient>;

function runStream(
  editor: Editor,
  content: string,
  stream: StreamInvoker,
  errorTitle: string,
  handlers: {
    onError?: (error: Error) => void;
  } = {},
): void {
  const sysPrompt = buildDocumentContextPrompt(editor);
  const abortController = new AbortController();
  let accumulatedContent = "";

  aiSuggestionManager.setAbortController(abortController);

  stream(content, sysPrompt, {
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
      aiSuggestionManager.setAbortController(null);
    },
    onError: (error: Error) => {
      aiSuggestionManager.setAbortController(null);
      if (error.name === "AbortError") return;
      console.error(`[${errorTitle}]`, error);
      handlers.onError?.(error);
      aiSuggestionManager.hide();
      showEditorNotice(editor, {
        message: errorTitle,
        description: error.message,
        kind: "error",
        duration: 3,
      });
    },
    signal: abortController.signal,
  });
}

/**
 * @param getLocaleText 发起实例的 locale 解析器；在会话开始时绑定到 `aiSuggestionManager`，
 * 使同页多实例各自弹出自己语言的悬浮层文案。
 */
export function runAiSuggestionStream(
  editor: Editor,
  selectedText: string,
  originalSelection: { from: number; to: number },
  stream: StreamInvoker,
  errorTitle: string,
  getLocaleText?: (key: string) => string,
): void {
  removeAiHighlight(editor);
  aiSuggestionManager.bindLocale(getLocaleText);
  aiSuggestionManager.show(selectedText, originalSelection, editor);
  runStream(editor, selectedText, stream, errorTitle);
}

export function runAiContinueWritingStream(
  editor: Editor,
  selectedText: string,
  userRange: { from: number; to: number },
  insertPosition: number,
  errorTitle: string,
  client: AiClient,
  getLocaleText?: (key: string) => string,
): void {
  aiSuggestionManager.bindLocale(getLocaleText);
  aiSuggestionManager.showContinueWriting(editor, selectedText, userRange, insertPosition);
  runStream(editor, selectedText, client.continueWriting.bind(client), errorTitle);
}
