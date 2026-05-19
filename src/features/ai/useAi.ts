/**
 * useAi Composable
 * Vue composable for AI features in editor（基于 AiClient）
 */

import { ref, readonly } from "vue";

import { createAiClient } from "./client";
import { AI_PROMPTS } from "./prompts";

import type { AiAdapter, AiStreamCallbacks } from "./types";

export interface UseAiOptions {
  adapter: AiAdapter;
  onError?: (error: Error) => void;
}

export interface UseAiReturn {
  isLoading: Readonly<ReturnType<typeof readonly<ReturnType<typeof ref<boolean>>>>>;
  result: Readonly<ReturnType<typeof readonly<ReturnType<typeof ref<string>>>>>;
  error: Readonly<ReturnType<typeof readonly<ReturnType<typeof ref<Error | null>>>>>;

  continueWriting: (text: string) => Promise<string>;
  polish: (text: string) => Promise<string>;
  summarize: (text: string) => Promise<string>;
  translate: (text: string, targetLang: string) => Promise<string>;
  customAi: (text: string, instruction: string) => Promise<string>;

  continueWritingStream: (text: string, callbacks: AiStreamCallbacks) => Promise<void>;
  polishStream: (text: string, callbacks: AiStreamCallbacks) => Promise<void>;
  summarizeStream: (text: string, callbacks: AiStreamCallbacks) => Promise<void>;
  translateStream: (
    text: string,
    targetLang: string,
    callbacks: AiStreamCallbacks,
  ) => Promise<void>;
  customAiStream: (
    text: string,
    instruction: string,
    callbacks: AiStreamCallbacks,
  ) => Promise<void>;

  abort: () => void;
}

function translateSystemPrompt(targetLang: string): string {
  const langName =
    AI_PROMPTS.translate.targetLanguages[
      targetLang as keyof typeof AI_PROMPTS.translate.targetLanguages
    ] || targetLang;
  return `${AI_PROMPTS.translate.system}\n目标语言: ${langName}`;
}

export function useAi(options: UseAiOptions): UseAiReturn {
  const { adapter, onError } = options;
  const client = createAiClient({ adapter });

  const isLoading = ref(false);
  const result = ref("");
  const error = ref<Error | null>(null);

  let abortController: AbortController | null = null;

  const handleError = (e: Error) => {
    error.value = e;
    onError?.(e);
  };

  const runChat = async (systemPrompt: string, userContent: string): Promise<string> => {
    abortController = new AbortController();
    isLoading.value = true;
    error.value = null;
    result.value = "";

    try {
      const content = await client.chat(systemPrompt, userContent);
      result.value = content;
      return content;
    } catch (e) {
      handleError(e as Error);
      throw e;
    } finally {
      isLoading.value = false;
    }
  };

  const runChatStream = async (
    systemPrompt: string,
    userContent: string,
    callbacks: AiStreamCallbacks,
  ): Promise<void> => {
    isLoading.value = true;
    error.value = null;
    result.value = "";

    const streamCallbacks: AiStreamCallbacks = {
      onStart: () => {
        callbacks.onStart?.();
      },
      onToken: (token) => {
        result.value += token;
        callbacks.onToken?.(token);
      },
      onComplete: (fullText) => {
        isLoading.value = false;
        callbacks.onComplete?.(fullText);
      },
      onError: (e) => {
        isLoading.value = false;
        handleError(e);
        callbacks.onError?.(e);
      },
    };

    try {
      await client.chatStream(systemPrompt, userContent, streamCallbacks);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    isLoading: readonly(isLoading),
    result: readonly(result),
    error: readonly(error),

    continueWriting: (text) => runChat(AI_PROMPTS.continueWriting.system, text),
    polish: (text) => runChat(AI_PROMPTS.polish.system, text),
    summarize: (text) => runChat(AI_PROMPTS.summarize.system, text),
    translate: (text, targetLang) => runChat(translateSystemPrompt(targetLang), text),
    customAi: (text, instruction) =>
      runChat(`${AI_PROMPTS.customAi.system}\n用户指令: ${instruction}`, text),

    continueWritingStream: (text, cb) => runChatStream(AI_PROMPTS.continueWriting.system, text, cb),
    polishStream: (text, cb) => runChatStream(AI_PROMPTS.polish.system, text, cb),
    summarizeStream: (text, cb) => runChatStream(AI_PROMPTS.summarize.system, text, cb),
    translateStream: (text, targetLang, cb) =>
      runChatStream(translateSystemPrompt(targetLang), text, cb),
    customAiStream: (text, instruction, cb) =>
      runChatStream(`${AI_PROMPTS.customAi.system}\n用户指令: ${instruction}`, text, cb),

    abort: () => {
      abortController?.abort();
      abortController = null;
    },
  };
}
