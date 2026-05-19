/**
 * AI Config Loader — 从环境变量加载构建时默认配置
 */

import { getProviderInfo } from "./config/types";

import type { AiConfig, AiProvider } from "./types";

/** Environment variable names */
const ENV_KEYS = {
  provider: "VITE_AI_PROVIDER",
  apiKey: "VITE_AI_API_KEY",
  apiSecret: "VITE_AI_API_SECRET",
  baseUrl: "VITE_AI_BASE_URL",
  model: "VITE_AI_MODEL",
  temperature: "VITE_AI_TEMPERATURE",
  maxTokens: "VITE_AI_MAX_TOKENS",
} as const;

function getEnv(key: string): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return (import.meta.env as Record<string, string>)[key];
  }
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env
  ) {
    return (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.[key];
  }
  return undefined;
}

function resolveProviderDefaults(provider: AiProvider): Pick<AiConfig, "baseUrl" | "model"> {
  const info = getProviderInfo(provider);
  return {
    baseUrl: info?.defaultEndpoint ?? "",
    model: info?.defaultModel ?? "gpt-4o-mini",
  };
}

/**
 * Load AI configuration from environment variables
 */
export function loadAiConfig(): AiConfig {
  const provider = (getEnv(ENV_KEYS.provider) || "openai") as AiProvider;
  const defaults = resolveProviderDefaults(provider);

  return {
    provider,
    apiKey: getEnv(ENV_KEYS.apiKey),
    apiSecret: getEnv(ENV_KEYS.apiSecret),
    baseUrl: getEnv(ENV_KEYS.baseUrl) || defaults.baseUrl,
    model: getEnv(ENV_KEYS.model) || defaults.model,
    temperature: parseFloat(getEnv(ENV_KEYS.temperature) || "0.7"),
    maxTokens: parseInt(getEnv(ENV_KEYS.maxTokens) || "2048", 10),
  };
}

/**
 * Create AI config manually
 */
export function createAiConfig(config: Partial<AiConfig>): AiConfig {
  const provider = config.provider || "openai";
  const defaults = resolveProviderDefaults(provider);

  return {
    provider,
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    baseUrl: config.baseUrl || defaults.baseUrl,
    model: config.model || defaults.model,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 2048,
  };
}
