import { createAiClient } from "@/features/ai/client";
import { getProviderInfo } from "@/features/ai/config/types";
import type { AiProvider } from "@/features/ai/config/types";

/** AI 扩展动态配置 — 全部 getter，禁止在 configure 时静态取值 */
export interface AiExtensionConfigureOptions {
  getProvider?: () => AiProvider;
  getApiKey?: () => string | undefined;
  getModel?: () => string | undefined;
  getEndpoint?: () => string | undefined;
  getTimeout?: () => number | undefined;
  /** 实例 locale 文案，key 为 dot-path（如 editor.pleaseSelectText） */
  getLocaleText?: (key: string) => string;
}

export function resolveAiExtensionOptions(options: AiExtensionConfigureOptions): {
  provider: AiProvider;
  apiKey: string;
  endpoint: string;
  model: string;
  timeout: number;
} {
  const provider = options.getProvider?.() ?? "openai";
  return {
    provider,
    apiKey: options.getApiKey?.() ?? "",
    endpoint: options.getEndpoint?.() ?? "",
    model: options.getModel?.() ?? "",
    timeout: options.getTimeout?.() ?? 60_000,
  };
}

export function localeText(
  options: AiExtensionConfigureOptions,
  key: string,
  fallback = key,
): string {
  return options.getLocaleText?.(key) ?? fallback;
}

/** 按扩展 options getter 创建 AI client，每次请求现取配置 */
export function createConfiguredAiClient(options: AiExtensionConfigureOptions) {
  return createAiClient({
    resolveConfig: () => {
      const cfg = resolveAiExtensionOptions(options);
      const info = getProviderInfo(cfg.provider);
      return {
        provider: cfg.provider,
        apiKey: cfg.apiKey,
        baseUrl: cfg.endpoint || info?.defaultEndpoint || "",
        model: cfg.model || info?.defaultModel || "gpt-4o-mini",
        timeout: cfg.timeout,
      };
    },
  });
}
