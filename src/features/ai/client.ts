/**
 * AI Client — 统一调用链（Extension + Vue UI 共用）
 */

import { getProviderInfo } from "./config/types";
import { getAiRequestConfig } from "./config/useAiConfig";
import { loadAiConfig } from "./envConfig";
import { createAiAdapter } from "./factory";
import { AI_PROMPTS } from "./prompts";

import type { AiProvider } from "./config/types";
import type { AiAdapter, AiMessage, AiStreamCallbacks } from "./types";

export interface CreateAiClientOptions {
  /** 传入时始终使用该 adapter，不走全局配置 / demo */
  adapter?: AiAdapter;
}

type AiDemoType = "continue" | "polish" | "summarize" | "translate" | "custom";

interface ResolvedAiConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
}

const DEFAULT_TIMEOUT = 60000;

function isAiDemoMode(): boolean {
  return typeof import.meta !== "undefined" && import.meta.env?.VITE_AI_DEMO_MODE === "true";
}

/** 统一错误对象，便于 UI 与扩展展示 */
export function normalizeAiError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error("AI 请求失败");
}

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

  const envConfig = loadAiConfig();
  return {
    provider: envConfig.provider,
    apiKey: envConfig.apiKey || "",
    baseUrl: envConfig.baseUrl || "",
    model: envConfig.model || "gpt-4o-mini",
    timeout: DEFAULT_TIMEOUT,
  };
}

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

function resolveAdapter(explicit?: AiAdapter): AiAdapter {
  if (explicit) return explicit;

  const config = getAiConfig();
  return createAiAdapter({
    provider: config.provider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });
}

async function simulateAiStream(callbacks: AiStreamCallbacks, demoType: AiDemoType): Promise<void> {
  const demoMessages: Record<AiDemoType, string> = {
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
  const signal = callbacks.signal;

  if (signal?.aborted) {
    callbacks.onComplete?.("");
    return;
  }

  try {
    callbacks.onStart?.();

    let index = 0;
    const streamInterval = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(streamInterval);
        callbacks.onComplete?.("");
        return;
      }
      if (index < message.length) {
        const chunkSize = Math.floor(Math.random() * 4) + 2;
        const chunk = message.slice(index, index + chunkSize);
        callbacks.onToken?.(chunk);
        index += chunkSize;
      } else {
        clearInterval(streamInterval);
        callbacks.onComplete?.(message);
      }
    }, 50);

    const onExternalAbort = () => {
      clearInterval(streamInterval);
      callbacks.onComplete?.("");
    };
    signal?.addEventListener("abort", onExternalAbort, { once: true });
  } catch (error) {
    callbacks.onError?.(normalizeAiError(error));
  }
}

function buildExtensionSystemPrompt(basePrompt: string, contextPrompt: string): string {
  if (!contextPrompt.trim()) return basePrompt;
  return `${contextPrompt}\n\n${basePrompt}`;
}

function translateTargetLabel(targetLang: string): string {
  return (
    AI_PROMPTS.translate.targetLanguages[
      targetLang as keyof typeof AI_PROMPTS.translate.targetLanguages
    ] || targetLang
  );
}

export function createAiClient(options: CreateAiClientOptions = {}) {
  const { adapter: fixedAdapter } = options;

  async function sendStreamingRequest(
    systemPrompt: string,
    content: string,
    callbacks: AiStreamCallbacks,
    demoType: AiDemoType = "custom",
  ): Promise<void> {
    if (!fixedAdapter && !isAiConfigured(getAiConfig())) {
      if (isAiDemoMode()) {
        await simulateAiStream(callbacks, demoType);
      } else {
        callbacks.onError?.(
          new Error(
            "请先在工具栏 AI 设置中配置 API Key，或设置 VITE_AI_DEMO_MODE=true 启用演示模式",
          ),
        );
      }
      return;
    }

    if (callbacks.signal?.aborted) {
      callbacks.onComplete?.("");
      return;
    }

    const messages: AiMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ];

    const adapter = resolveAdapter(fixedAdapter);

    try {
      await adapter.chatStream(messages, callbacks);
    } catch (error) {
      callbacks.onError?.(normalizeAiError(error));
    }
  }

  return {
    continueWriting(content: string, contextPrompt: string, callbacks: AiStreamCallbacks): void {
      const prompt = buildExtensionSystemPrompt(AI_PROMPTS.continueWriting.system, contextPrompt);
      sendStreamingRequest(prompt, content, callbacks, "continue");
    },

    polish(content: string, contextPrompt: string, callbacks: AiStreamCallbacks): void {
      const prompt = buildExtensionSystemPrompt(AI_PROMPTS.polish.system, contextPrompt);
      sendStreamingRequest(prompt, content, callbacks, "polish");
    },

    summarize(content: string, contextPrompt: string, callbacks: AiStreamCallbacks): void {
      const prompt = buildExtensionSystemPrompt(AI_PROMPTS.summarize.system, contextPrompt);
      sendStreamingRequest(prompt, content, callbacks, "summarize");
    },

    translate(
      content: string,
      targetLang: string,
      contextPrompt: string,
      callbacks: AiStreamCallbacks,
    ): void {
      const langName = translateTargetLabel(targetLang);
      const prompt = buildExtensionSystemPrompt(
        `${AI_PROMPTS.translate.system}\n目标语言: ${langName}`,
        contextPrompt,
      );
      sendStreamingRequest(prompt, content, callbacks, "translate");
    },

    customCommand(
      content: string,
      customPrompt: string,
      contextPrompt: string,
      callbacks: AiStreamCallbacks,
    ): void {
      const prompt = buildExtensionSystemPrompt(
        `${AI_PROMPTS.customAi.system}\n用户指令: ${customPrompt}`,
        contextPrompt,
      );
      sendStreamingRequest(prompt, content, callbacks, "custom");
    },
  };
}

/** 默认实例：Extension 使用（读取全局配置 / demo） */
export const aiClient = createAiClient();
