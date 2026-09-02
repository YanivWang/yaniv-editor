/**
 * OpenAI Adapter
 * Compatible with OpenAI API standard (also works with DeepSeek, etc.)
 */

import { readStreamLines } from "./readStreamLines";

import type { AiAdapter, AiConfig, AiMessage, AiResponse, AiStreamCallbacks } from "../types";

export class OpenAiAdapter implements AiAdapter {
  provider = "openai" as const;
  private config: AiConfig;

  constructor(config: AiConfig) {
    this.config = config;
  }

  async chat(messages: AiMessage[], options?: Partial<AiConfig>): Promise<AiResponse> {
    const config = { ...this.config, ...options };

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || "",
      finishReason: choice?.finish_reason,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async chatStream(
    messages: AiMessage[],
    callbacks: AiStreamCallbacks,
    options?: Partial<AiConfig>,
  ): Promise<void> {
    const config = { ...this.config, ...options };

    callbacks.onStart?.();

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        signal: callbacks.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      let fullText = "";

      for await (const rawLine of readStreamLines(response.body)) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim(); // 去掉 'data:' 前缀（冒号后的空格可有可无）
        if (!data || data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content || "";
          if (token) {
            fullText += token;
            callbacks.onToken?.(token);
          }
        } catch {
          // Skip invalid JSON
        }
      }

      callbacks.onComplete?.(fullText);
    } catch (error) {
      callbacks.onError?.(error as Error);
    }
  }
}

export function createOpenAiAdapter(config: AiConfig): AiAdapter {
  return new OpenAiAdapter(config);
}
