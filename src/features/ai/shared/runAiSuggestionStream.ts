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

export function runAiSuggestionStream(
  editor: Editor,
  selectedText: string,
  originalSelection: { from: number; to: number },
  stream: StreamInvoker,
  errorTitle: string,
): void {
  removeAiHighlight(editor);
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
): void {
  aiSuggestionManager.showContinueWriting(editor, selectedText, userRange, insertPosition);
  runStream(editor, selectedText, client.continueWriting.bind(client), errorTitle);
}
