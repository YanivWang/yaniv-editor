/**
 * AI Client — 统一调用链（Extension + Vue UI 共用）
 */

import { getHostAiConfig } from "./config/hostConfig";
import { getProviderInfo } from "./config/types";
import { getAiRequestConfig, isHostAiManaged } from "./config/useAiConfig";
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, loadAiConfig } from "./envConfig";
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
  /**
   * 实例 locale 解析器（dot-path key）。AI 扩展经 `createConfiguredAiClient` 注入，
   * 因此编辑器内发起的请求一定带上；只有直接使用导出的 `aiClient` 单例时才会缺省，
   * 那种情况退回下面各调用点的英文兜底串。
   */
  getLocaleText?: (key: string) => string;
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

/** 取实例 locale 文案；无解析器或查不到 key 时用调用点给的英文兜底 */
type LocaleText = (key: string, fallback: string) => string;

function createLocaleText(getLocaleText?: (key: string) => string): LocaleText {
  return (key, fallback) => {
    const resolved = getLocaleText?.(key);
    // 解析器查不到时会原样回 key，那等同于「没有文案」
    return resolved && resolved !== key ? resolved : fallback;
  };
}

interface ResolvedAiConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  /** 采样温度 —— 只有 `VITE_AI_TEMPERATURE` 这一个来源，见 {@link resolveModelTuning} */
  temperature: number;
  /** 最大输出 token —— 只有 `VITE_AI_MAX_TOKENS` 这一个来源 */
  maxTokens: number;
  /** proxy 表示密钥由后端保管，前端无需 apiKey；参与 `isAiConfigured` 判定 */
  storageMode?: AiStorageMode;
}

const DEFAULT_TIMEOUT = 60000;

/**
 * 模型调参（temperature / maxTokens）**不跟随凭据来源分级**。
 *
 * 宿主 `ai-config` 与 AI 设置弹窗写进 localStorage 的配置都不含这两项，
 * 若按凭据那套「命中即返回」的分级走，只要用户在弹窗里配过 key，
 * `VITE_AI_TEMPERATURE` 就永远被跳过——那正是这两个变量此前形同虚设的原因之一。
 * 因此这里单独解析：无论最终用哪一级的 key / endpoint，调参都取构建期变量或内置默认值。
 */
function resolveModelTuning(): Pick<ResolvedAiConfig, "temperature" | "maxTokens"> {
  const env = loadAiConfig();
  return {
    temperature: env.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: env.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
}

function isAiDemoMode(): boolean {
  return typeof import.meta !== "undefined" && import.meta.env?.VITE_AI_DEMO_MODE === "true";
}

/**
 * 统一错误对象，便于 UI 与扩展展示。
 *
 * @param fallbackMessage 抛出的既不是 `Error` 也不是字符串时用的文案。
 * `createAiClient` 会传入按实例 locale 解析好的 `messages.aiRequestFailed`；
 * 直接调用本函数（adapter 层没有 locale 上下文）时用英文兜底。
 */
export function normalizeAiError(error: unknown, fallbackMessage = "AI request failed"): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error(fallbackMessage);
}

/**
 * 配置解析的**唯一入口**。优先级（自上而下，命中即返回）：
 * 1. `resolveOverride()` — 宿主 `ai-config` prop（经扩展 getter 逐次现取）
 * 2. `getAiRequestConfig()` — 已登记的宿主托管副本，否则 localStorage 用户配置；
 *    该函数内部会校验 `enabled` 与 `apiKey`（proxy 模式除外），不合格返回 `null`
 * 3. `getHostAiConfig()` — 上一级因校验不过而落空、但确实有宿主托管配置时的兜底：
 *    仍按宿主声明的 provider / endpoint / model 走，**不**再下沉到 `.env`
 *    （避免宿主明确托管却悄悄用上构建期密钥）
 * 4. `loadAiConfig()` — 构建期 `VITE_AI_*`
 *
 * 第 2、3 级都用无 owner 的查询，因此同页存在多个传 `ai-config` 的实例时返回 `null`
 * （见 `config/hostConfig.ts`）；扩展发起的请求靠第 1 级的实例作用域 getter，不受影响。
 *
 * 上游各层**不得**自行填兜底值：一旦 override 带上了 provider，就意味着"宿主已托管"，
 * 后面几级回退将被跳过。缺省值一律在本函数内补齐。
 */
function getAiConfig(resolveOverride?: () => AiRuntimeConfigOverride | null): ResolvedAiConfig {
  const tuning = resolveModelTuning();
  const runtime = resolveOverride?.();
  if (runtime?.provider) {
    const providerInfo = getProviderInfo(runtime.provider);
    return {
      ...tuning,
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
      ...tuning,
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
      ...tuning,
      provider,
      apiKey: "",
      baseUrl: host?.endpoint ?? providerInfo?.defaultEndpoint ?? "",
      model: host?.model ?? providerInfo?.defaultModel ?? "gpt-4o-mini",
      timeout: host?.timeout ?? DEFAULT_TIMEOUT,
    };
  }

  const envConfig = loadAiConfig();
  return {
    ...tuning,
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
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });
}

async function simulateAiStream(
  callbacks: AiStreamCallbacks,
  demoType: AiDemoType,
  text: LocaleText,
): Promise<void> {
  const message = text(
    `aiDemo.${demoType}`,
    "AI demo mode: configure an API Key under AI Settings in the toolbar to use a real provider.",
  );
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
  const text = createLocaleText(options.getLocaleText);

  async function sendStreamingRequest(
    systemPrompt: string,
    content: string,
    callbacks: AiStreamCallbacks,
    demoType: AiDemoType = "custom",
  ): Promise<void> {
    if (!fixedAdapter && !isAiConfigured(getAiConfig(resolveConfig))) {
      if (isAiDemoMode()) {
        await simulateAiStream(callbacks, demoType, text);
      } else {
        callbacks.onError?.(
          new Error(
            text(
              "messages.aiNotConfigured",
              "Configure an API Key under AI Settings in the toolbar, or set VITE_AI_DEMO_MODE=true to try the simulated stream.",
            ),
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
      callbacks.onError?.(
        normalizeAiError(error, text("messages.aiRequestFailed", "AI request failed")),
      );
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

/**
 * 默认实例：无 locale 解析器，文案退回英文兜底。
 * 编辑器内的 AI 扩展一律走 `createConfiguredAiClient(this.options)`，不用这个单例；
 * 它只是给直接调用本包 API 的宿主留的入口。
 */
export const aiClient = createAiClient();
