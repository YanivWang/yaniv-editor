/**
 * AI Client — 统一调用链（Extension + Vue UI 共用）
 */

import { getHostAiConfig } from "./config/hostConfig";
import { getProviderInfo } from "./config/types";
import { getAiRequestConfig, isHostAiManaged } from "./config/useAiConfig";
import { loadAiConfig } from "./envConfig";
import { createAiAdapter } from "./factory";
import { AI_PROMPTS } from "./prompts";

import type { AiProvider, AiStorageMode } from "./config/types";
import type { AiAdapter, AiMessage, AiStreamCallbacks } from "./types";

export interface CreateAiClientOptions {
  /** 传入时始终使用该 adapter，不走全局配置 / demo */
  adapter?: AiAdapter;
  /**
   * 扩展 configure getter：每次请求时现取最新 aiConfig。
   * 返回 `null`（或不含 provider）表示"本层无配置"，交由 `getAiConfig()` 继续走
   * localStorage / 宿主托管 / `.env` 回退链。
   */
  resolveConfig?: () => AiRuntimeConfigOverride | null;
}

/** 扩展层透传的宿主原值，字段可缺省，缺省部分由 `getAiConfig()` 补齐 */
export interface AiRuntimeConfigOverride {
  provider?: AiProvider;
  apiKey?: string;
  endpoint?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  storageMode?: AiStorageMode;
}

type AiDemoType = "continue" | "polish" | "summarize" | "translate" | "custom";

interface ResolvedAiConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  /** proxy 表示密钥由后端保管，前端无需 apiKey；参与 `isAiConfigured` 判定 */
  storageMode?: AiStorageMode;
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

/**
 * 配置解析的**唯一入口**。优先级：
 * 1. `resolveOverride()` — 宿主 `ai-config` prop（经扩展 getter 透传）
 * 2. `getAiRequestConfig()` — localStorage 用户配置 / 宿主托管副本
 * 3. `loadAiConfig()` — 构建期 `VITE_AI_*`
 *
 * 上游各层**不得**自行填兜底值：一旦 override 带上了 provider，就意味着"宿主已托管"，
 * 后两级回退将被跳过。缺省值一律在本函数内补齐。
 */
function getAiConfig(resolveOverride?: () => AiRuntimeConfigOverride | null): ResolvedAiConfig {
  const runtime = resolveOverride?.();
  if (runtime?.provider) {
    const providerInfo = getProviderInfo(runtime.provider);
    return {
      provider: runtime.provider,
      apiKey: runtime.apiKey ?? "",
      baseUrl: runtime.baseUrl ?? runtime.endpoint ?? providerInfo?.defaultEndpoint ?? "",
      model: runtime.model ?? providerInfo?.defaultModel ?? "gpt-4o-mini",
      timeout: runtime.timeout ?? DEFAULT_TIMEOUT,
      storageMode: runtime.storageMode,
    };
  }

  const userConfig = getAiRequestConfig();
  if (userConfig) {
    return {
      provider: userConfig.provider,
      apiKey: userConfig.apiKey,
      baseUrl: userConfig.endpoint,
      model: userConfig.model,
      timeout: userConfig.timeout,
      // getAiRequestConfig 内部已按 storageMode 校验过 apiKey，到这里即视为合格
      storageMode: "proxy",
    };
  }

  if (isHostAiManaged()) {
    const host = getHostAiConfig();
    const provider = host?.provider ?? "openai";
    const providerInfo = getProviderInfo(provider);
    return {
      provider,
      apiKey: "",
      baseUrl: host?.endpoint ?? providerInfo?.defaultEndpoint ?? "",
      model: host?.model ?? providerInfo?.defaultModel ?? "gpt-4o-mini",
      timeout: host?.timeout ?? DEFAULT_TIMEOUT,
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

  // proxy：密钥由后端保管，前端不应有 apiKey，只要有可达 endpoint 即视为已配置
  if (config.storageMode === "proxy") {
    return Boolean(config.baseUrl?.trim());
  }

  if (providerInfo.requiresApiKey) {
    return Boolean(config.apiKey?.trim());
  }

  if (config.provider === "ollama" || config.provider === "custom") {
    return Boolean(config.baseUrl?.trim());
  }

  return true;
}

function resolveAdapter(
  explicit?: AiAdapter,
  resolveOverride?: () => AiRuntimeConfigOverride | null,
): AiAdapter {
  if (explicit) return explicit;

  const config = getAiConfig(resolveOverride);
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
    let streamInterval: ReturnType<typeof setInterval> | null = null;
    let settled = false;
    const finish = (message: string) => {
      if (settled) return;
      settled = true;
      if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
      }
      signal?.removeEventListener("abort", onExternalAbort);
      callbacks.onComplete?.(message);
    };
    const onExternalAbort = () => finish("");

    streamInterval = setInterval(() => {
      if (signal?.aborted) {
        finish("");
        return;
      }
      if (index < message.length) {
        const chunkSize = Math.floor(Math.random() * 4) + 2;
        const chunk = message.slice(index, index + chunkSize);
        callbacks.onToken?.(chunk);
        index += chunkSize;
      } else {
        finish(message);
      }
    }, 50);
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
  const { adapter: fixedAdapter, resolveConfig } = options;

  async function sendStreamingRequest(
    systemPrompt: string,
    content: string,
    callbacks: AiStreamCallbacks,
    demoType: AiDemoType = "custom",
  ): Promise<void> {
    if (!fixedAdapter && !isAiConfigured(getAiConfig(resolveConfig))) {
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

    const adapter = resolveAdapter(fixedAdapter, resolveConfig);

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
