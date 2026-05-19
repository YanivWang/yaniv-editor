/**
 * AI Features for Yaniv Editor
 * @description Collection of AI-powered text processing features
 */

export { CustomAiExtension } from "./custom-ai";
export type { CustomAiOptions } from "./custom-ai";

export { ContinueWritingExtension } from "./continue-writing";
export type { ContinueWritingOptions } from "./continue-writing";

export { PolishExtension } from "./polish";
export type { PolishOptions } from "./polish";

export { SummarizeExtension } from "./summarize";
export type { SummarizeOptions } from "./summarize";

export { TranslationExtension } from "./translation";
export type { TranslationOptions } from "./translation";

export { AiHighlightMark } from "./shared";
export type { AiSuggestionData } from "./shared";

export { aiSuggestionManager } from "./shared";
export type { AiSuggestionState } from "./shared";

export { runAiSuggestionStream, runAiContinueWritingStream } from "./shared/runAiSuggestionStream";
export { buildDocumentContextPrompt } from "./shared/documentContext";

export { default as CustomAiPopover } from "./shared/CustomAiPopover.vue";
export { default as AiSuggestionPopover } from "./shared/AiSuggestionPopover.vue";

export { default as AiMenuButton } from "./AiMenuButton.vue";

export { AiSettingsModal } from "./components";

export { aiClient, createAiClient, normalizeAiError } from "./client";
export type { CreateAiClientOptions } from "./client";

export type { AiAdapter, AiMessage, AiStreamCallbacks } from "./types";

export { useAiConfig, getAiRequestConfig } from "./config/useAiConfig";
export { AI_PROVIDERS, DEFAULT_CONFIG, getProviderInfo } from "./config/types";
export type { AiProvider, AiProviderInfo, AiUserConfig, AiConfigState } from "./config/types";
