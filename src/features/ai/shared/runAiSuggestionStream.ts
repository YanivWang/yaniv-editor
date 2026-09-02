import { showEditorNotice, showEditorToast } from "@/core/overlayFeedback";
import type { createAiClient } from "@/features/ai/client";

import { removeAiHighlight } from "./AiHighlightMark";
import { aiSuggestionManager } from "./aiSuggestionManager";
import { buildDocumentContext } from "./documentContext";

import type { AiStreamCallbacks } from "../types";
import type { Editor } from "@tiptap/core";

type StreamInvoker = (content: string, sysPrompt: string, callbacks: AiStreamCallbacks) => void;
type AiClient = ReturnType<typeof createAiClient>;

/**
 * 上下文被截断时给用户一次明确提示。
 *
 * 静默截断会无声降低回答质量：用户只会觉得「AI 这次答得不太行」，
 * 却不知道模型根本没看到全文。文案走实例 locale，占位符按 `{kept}` / `{total}` 替换。
 */
export function noticeDocumentContextTruncation(
  editor: Editor,
  context: { truncated: boolean; keptChars: number; totalChars: number },
  getLocaleText?: (key: string) => string,
): void {
  if (!context.truncated) return;
  const template =
    getLocaleText?.("messages.aiDocumentContextTruncated") ?? "messages.aiDocumentContextTruncated";
  showEditorToast(editor, {
    content: template
      .replace("{kept}", String(context.keptChars))
      .replace("{total}", String(context.totalChars)),
    kind: "warning",
    duration: 4,
  });
}

function runStream(
  editor: Editor,
  content: string,
  stream: StreamInvoker,
  errorTitle: string,
  options: {
    documentContextLimit?: number;
    getLocaleText?: (key: string) => string;
  } = {},
): void {
  const context = buildDocumentContext(editor, options.documentContextLimit);
  noticeDocumentContextTruncation(editor, context, options.getLocaleText);
  const sysPrompt = context.prompt;
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
      aiSuggestionManager.clearAbortController(abortController);
    },
    onError: (error: Error) => {
      // 按身份清：换流时旧流的 AbortError 晚于新流启动，无条件清空会把新流的
      // 取消能力一起扔掉（见 aiSuggestionManager.clearAbortController）
      aiSuggestionManager.clearAbortController(abortController);
      if (error.name === "AbortError") return;
      console.error(`[${errorTitle}]`, error);
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
  documentContextLimit?: number,
): void {
  removeAiHighlight(editor);
  aiSuggestionManager.bindLocale(getLocaleText);
  aiSuggestionManager.show(selectedText, originalSelection, editor);
  runStream(editor, selectedText, stream, errorTitle, { documentContextLimit, getLocaleText });
}

export function runAiContinueWritingStream(
  editor: Editor,
  selectedText: string,
  userRange: { from: number; to: number },
  insertPosition: number,
  errorTitle: string,
  client: AiClient,
  getLocaleText?: (key: string) => string,
  documentContextLimit?: number,
): void {
  aiSuggestionManager.bindLocale(getLocaleText);
  aiSuggestionManager.showContinueWriting(editor, selectedText, userRange, insertPosition);
  runStream(editor, selectedText, client.continueWriting.bind(client), errorTitle, {
    documentContextLimit,
    getLocaleText,
  });
}
