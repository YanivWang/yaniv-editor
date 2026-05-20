/**
 * Host-managed AI config — set via YanivEditor `ai-config` prop (never persisted)
 */

import type { YanivEditorAiConfig } from "@/core/editorTypes";

import { DEFAULT_CONFIG, getProviderInfo } from "./types";

import type { AiUserConfig } from "./types";

let hostAiConfig: AiUserConfig | null = null;

function normalizeHostConfig(input: YanivEditorAiConfig): AiUserConfig {
  const providerInfo = getProviderInfo(input.provider);
  const storageMode = input.storageMode ?? "memory";

  return {
    provider: input.provider,
    apiKey: input.apiKey ?? "",
    storageMode,
    endpoint: input.endpoint ?? providerInfo?.defaultEndpoint ?? "",
    model: input.model ?? providerInfo?.defaultModel ?? DEFAULT_CONFIG.model,
    timeout: input.timeout ?? DEFAULT_CONFIG.timeout,
    enabled: input.enabled !== false,
    updatedAt: Date.now(),
  };
}

/** 是否由集成方 props 托管（为 true 时忽略 localStorage / .env） */
export function isHostAiManaged(): boolean {
  return hostAiConfig !== null;
}

export function getHostAiConfig(): AiUserConfig | null {
  return hostAiConfig;
}

export function setHostAiConfig(input: YanivEditorAiConfig | null | undefined): void {
  hostAiConfig = input ? normalizeHostConfig(input) : null;
}
