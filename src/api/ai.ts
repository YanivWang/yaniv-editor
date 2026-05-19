/**
 * AI API Service
 * Provides AI streaming capabilities using user configuration or environment variables
 */

import { getProviderInfo } from "@/ai/config/types";
import { getAiRequestConfig } from "@/ai/config/useAiConfig";
import { createAiAdapter } from "@/ai/factory";
import type { AiMessage, AiProvider } from "@/ai/types";

// AI Callback interface used by the extensions
export interface AiStreamCallback {
  onStart?: () => void;
  onMessage?: (message: { content: string }) => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
  /** 传入后可用 AbortController.abort() 或 signal.abort() 取消流式请求 */
  signal?: AbortSignal;
}

export interface AiApiResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/** 统一错误对象，便于 UI 与扩展展示 */
export function normalizeAiError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error("AI 请求失败");
}

interface ResolvedAiConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
}

/**
 * Load API configuration
 * Priority: User config > Environment variables > Defaults
 */
function getAiConfig(): ResolvedAiConfig {
  const userConfig = getAiRequestConfig();
  if (userConfig) {
    return {
      provider: userConfig.provider,
      apiKey: userConfig.apiKey,
      baseUrl: userConfig.endpoint,
      model: userConfig.model,
      timeout: userConfig.timeout,
    };
  }

  const env = import.meta.env || {};
  const provider = (env.VITE_AI_PROVIDER || "openai") as AiProvider;

  return {
    provider,
    apiKey: env.VITE_AI_API_KEY || "",
    baseUrl: env.VITE_AI_BASE_URL || "",
    model: env.VITE_AI_MODEL || "gpt-4o-mini",
    timeout: DEFAULT_TIMEOUT,
  };
}

/** 是否已配置可用的 AI（Ollama 等无需 API Key 的提供商单独判断） */
function isAiConfigured(config: ResolvedAiConfig): boolean {
  const providerInfo = getProviderInfo(config.provider);
  if (!providerInfo) return false;

  if (providerInfo.requiresApiKey) {
    return Boolean(config.apiKey?.trim());
  }

  if (config.provider === "ollama" || config.provider === "custom") {
    return Boolean(config.baseUrl?.trim());
  }

  return true;
}

// Default timeout for AI requests (60 seconds)
const DEFAULT_TIMEOUT = 60000;

/**
 * Simulate AI streaming response for demo purposes
 * Shows how the AI feature works without requiring API key configuration
 */
async function simulateAiStream(
  callback: AiStreamCallback,
  demoType: "continue" | "polish" | "summarize" | "translate" | "custom",
): Promise<void> {
  const demoMessages: Record<typeof demoType, string> = {
    continue:
      "这是 AI 续写功能的演示效果。\n\n💡 提示：要使用真实的 AI 功能，请在工具栏的 AI 设置中配置您的 API Key。\n\n支持的 AI 提供商：\n• OpenAI (GPT-4, GPT-3.5)\n• 阿里云通义千问\n• DeepSeek\n• Ollama (本地部署)\n\n配置后，AI 将根据您的内容智能续写，帮助您快速完成文档创作。",
    polish:
      "这是 AI 润色功能的演示效果。\n\n💡 提示：要使用真实的 AI 润色功能，请在工具栏的 AI 设置中配置您的 API Key。\n\n配置后，AI 将帮助您：\n• 优化文字表达，使语句更流畅\n• 修正语法错误\n• 提升专业度和可读性\n• 保持原意的同时改善文风",
    summarize:
      "这是 AI 总结功能的演示效果。\n\n💡 提示：要使用真实的 AI 总结功能，请在工具栏的 AI 设置中配置您的 API Key。\n\n配置后，AI 将智能提取内容要点，生成简洁的摘要，帮助读者快速理解核心信息。",
    translate:
      "这是 AI 翻译功能的演示效果。\n\n💡 Tip: To use the real AI translation feature, please configure your API Key in the AI Settings on the toolbar.\n\nAfter configuration, AI will provide high-quality translations while maintaining the original meaning and style.",
    custom:
      "这是自定义 AI 命令的演示效果。\n\n💡 提示：要使用真实的自定义 AI 功能，请在工具栏的 AI 设置中配置您的 API Key。\n\n配置后，您可以输入任何自定义指令，AI 将根据您的要求处理选中的文本。",
  };

  const message = demoMessages[demoType];
  const signal = callback.signal;

  if (signal?.aborted) {
    callback.onStop?.();
    return;
  }

  try {
    callback.onStart?.();

    let index = 0;
    const streamInterval = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(streamInterval);
        callback.onStop?.();
        return;
      }
      if (index < message.length) {
        const chunkSize = Math.floor(Math.random() * 4) + 2;
        const chunk = message.slice(index, index + chunkSize);
        callback.onMessage?.({ content: chunk });
        index += chunkSize;
      } else {
        clearInterval(streamInterval);
        callback.onStop?.();
      }
    }, 50);

    const onExternalAbort = () => {
      clearInterval(streamInterval);
      callback.onStop?.();
    };
    signal?.addEventListener("abort", onExternalAbort, { once: true });
  } catch (error) {
    callback.onError?.(normalizeAiError(error));
  }
}

/**
 * Send streaming request via configured adapter, or demo stream when unconfigured
 */
async function sendStreamingRequest(
  prompt: string,
  content: string,
  callback: AiStreamCallback,
  demoType?: "continue" | "polish" | "summarize" | "translate" | "custom",
): Promise<void> {
  const config = getAiConfig();

  if (!isAiConfigured(config)) {
    await simulateAiStream(callback, demoType || "custom");
    return;
  }

  if (callback.signal?.aborted) {
    callback.onStop?.();
    return;
  }

  const messages: AiMessage[] = [
    { role: "system", content: prompt },
    { role: "user", content },
  ];

  const adapter = createAiAdapter({
    provider: config.provider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });

  try {
    await adapter.chatStream(messages, {
      onStart: () => callback.onStart?.(),
      onToken: (token) => callback.onMessage?.({ content: token }),
      onComplete: () => callback.onStop?.(),
      onError: (error) => callback.onError?.(normalizeAiError(error)),
    });
  } catch (error) {
    callback.onError?.(normalizeAiError(error));
  }
}

/**
 * AI API Service
 * Compatible with the original Kortex aiApiService interface
 */
export const aiApiService = {
  /**
   * Continue writing - streaming
   */
  continueWriting(content: string, sysPrompt: string, callback: AiStreamCallback): void {
    const prompt = `${sysPrompt}\n\n你是一个专业的写作助手。请根据用户选中的文字，续写接下来的内容。保持原文的风格和语气。只输出续写的内容，不要重复用户选中的文字。`;
    sendStreamingRequest(prompt, content, callback, "continue");
  },

  /**
   * Polish text - streaming
   */
  polish(content: string, sysPrompt: string, callback: AiStreamCallback): void {
    const prompt = `${sysPrompt}\n\n你是一个专业的文字润色助手。请润色以下文字，使其更加流畅、专业。保持原意，只输出润色后的文字。`;
    sendStreamingRequest(prompt, content, callback, "polish");
  },

  /**
   * Summarize content - streaming
   */
  summarize(content: string, sysPrompt: string, callback: AiStreamCallback): void {
    const prompt = `${sysPrompt}\n\n你是一个专业的总结助手。请总结以下内容的要点。简洁明了，输出总结内容。`;
    sendStreamingRequest(prompt, content, callback, "summarize");
  },

  /**
   * Translate text - streaming
   */
  translate(
    content: string,
    targetLang: string,
    sysPrompt: string,
    callback: AiStreamCallback,
  ): void {
    const prompt = `${sysPrompt}\n\n你是一个专业的翻译助手。请将以下内容翻译为${targetLang}。只输出翻译结果。`;
    sendStreamingRequest(prompt, content, callback, "translate");
  },

  /**
   * Custom AI command - streaming
   */
  customCommand(
    content: string,
    customPrompt: string,
    sysPrompt: string,
    callback: AiStreamCallback,
  ): void {
    const prompt = `${sysPrompt}\n\n${customPrompt}`;
    sendStreamingRequest(prompt, content, callback, "custom");
  },
};
