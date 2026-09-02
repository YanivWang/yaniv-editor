/**
 * AI Config Loader — 从环境变量加载构建时默认配置。
 *
 * 这是 `client.ts` 的 `getAiConfig()` 回退链最后一级（前面还有宿主 `ai-config`
 * 与 localStorage）。
 *
 * 例外：`temperature` / `maxTokens` 是**模型调参**，宿主 `ai-config` 与 localStorage
 * 都不携带这两项，因此它们不跟随凭据来源分级——`getAiConfig()` 无论最终用哪一级的
 * key / endpoint，都从这里取值（见该函数的 `resolveModelTuning`）。
 */

import { getProviderInfo } from "./config/types";

import type { AiConfig, AiProvider } from "./types";

/** Environment variable names */
const ENV_KEYS = {
  provider: "VITE_AI_PROVIDER",
  apiKey: "VITE_AI_API_KEY",
  baseUrl: "VITE_AI_BASE_URL",
  model: "VITE_AI_MODEL",
  temperature: "VITE_AI_TEMPERATURE",
  maxTokens: "VITE_AI_MAX_TOKENS",
} as const;

/** 模型调参默认值 —— 全库唯一来源，`loadAiConfig` / `createAiConfig` / `client.ts` 共用 */
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 2048;

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

/** 解析数值型环境变量；缺省或不是有限数时用兜底值（`Number("abc")`、`Number("1.5x")` 都是 NaN） */
function readNumberEnv(key: string, fallback: number): number {
  const raw = getEnv(key);
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    baseUrl: getEnv(ENV_KEYS.baseUrl) || defaults.baseUrl,
    model: getEnv(ENV_KEYS.model) || defaults.model,
    temperature: readNumberEnv(ENV_KEYS.temperature, DEFAULT_TEMPERATURE),
    maxTokens: readNumberEnv(ENV_KEYS.maxTokens, DEFAULT_MAX_TOKENS),
  };
}

/**
 * 补齐一份 AiConfig（供 `factory.createAiAdapter` 使用）。
 * 正常链路里 `client.ts` 已经把每个字段解析好了，这里的兜底只服务直接调
 * `createAiAdapter()` 的调用方。
 */
export function createAiConfig(config: Partial<AiConfig>): AiConfig {
  const provider = config.provider || "openai";
  const defaults = resolveProviderDefaults(provider);

  return {
    provider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl || defaults.baseUrl,
    model: config.model || defaults.model,
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
}
