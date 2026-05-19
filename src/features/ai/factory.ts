/**
 * AI Adapter Factory
 */

import { createAliyunAdapter } from "./adapters/aliyun";
import { createOllamaAdapter } from "./adapters/ollama";
import { createOpenAiAdapter } from "./adapters/openai";
import { createAiConfig } from "./envConfig";

import type { AiAdapter, AiConfig, AiProvider } from "./types";

const adapterFactories: Record<AiProvider, (config: AiConfig) => AiAdapter> = {
  openai: createOpenAiAdapter,
  deepseek: createOpenAiAdapter,
  aliyun: createAliyunAdapter,
  ollama: createOllamaAdapter,
  custom: createOpenAiAdapter,
};

export function createAiAdapter(configInput: Partial<AiConfig>): AiAdapter {
  const config = createAiConfig(configInput);
  const factory = adapterFactories[config.provider];

  if (!factory) {
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }

  return factory(config);
}
