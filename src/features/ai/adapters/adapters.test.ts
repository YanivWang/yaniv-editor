import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAiAdapter } from "../factory";

import { createAliyunAdapter } from "./aliyun";
import { createOllamaAdapter } from "./ollama";
import { createOpenAiAdapter } from "./openai";

import type { AiConfig, AiMessage, AiStreamCallbacks } from "../types";

const messages: AiMessage[] = [{ role: "user", content: "hi" }];

function baseConfig(overrides: Partial<AiConfig> = {}): AiConfig {
  return {
    provider: "openai",
    apiKey: "sk-test",
    baseUrl: "https://api.example.com/v1",
    model: "test-model",
    temperature: 0.5,
    maxTokens: 128,
    ...overrides,
  };
}

/** 把若干字符串块伪装成 fetch 的可读流响应 */
function streamResponse(chunks: string[], ok = true, status = 200): Response {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    ok,
    status,
    text: () => Promise.resolve("upstream failure"),
    body: {
      getReader: () => ({
        read: () =>
          index < chunks.length
            ? Promise.resolve({ done: false, value: encoder.encode(chunks[index++]) })
            : Promise.resolve({ done: true, value: undefined }),
      }),
    },
  } as unknown as Response;
}

/**
 * 按**字节**切分的流式响应：分片位置可能落在行中间或多字节字符中间，
 * 复现真实网络分片。`streamResponse` 的每个 chunk 都恰好是完整的若干行，
 * 覆盖不到这条路径。
 */
function splitStreamResponse(text: string, at: number): Response {
  const bytes = new TextEncoder().encode(text);
  const chunks = [bytes.slice(0, at), bytes.slice(at)];
  let index = 0;
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(""),
    body: {
      getReader: () => ({
        read: () =>
          index < chunks.length
            ? Promise.resolve({ done: false, value: chunks[index++] })
            : Promise.resolve({ done: true, value: undefined }),
      }),
    },
  } as unknown as Response;
}

function jsonResponse(payload: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(typeof payload === "string" ? payload : JSON.stringify(payload)),
  } as unknown as Response;
}

function collect(): AiStreamCallbacks & { tokens: string[]; done: string[]; errors: Error[] } {
  const tokens: string[] = [];
  const done: string[] = [];
  const errors: Error[] = [];
  return {
    tokens,
    done,
    errors,
    onStart: () => {},
    onToken: (t) => tokens.push(t),
    onComplete: (full) => done.push(full),
    onError: (e) => errors.push(e),
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OpenAI 适配器（DeepSeek / custom 共用）", () => {
  it("chat 命中 /chat/completions 并带 Bearer 头", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "hello" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      }),
    );

    const result = await createOpenAiAdapter(baseConfig()).chat(messages);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init.body as string).stream).toBe(false);

    expect(result.content).toBe("hello");
    expect(result.finishReason).toBe("stop");
    expect(result.usage).toEqual({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });
  });

  it("chat 在非 2xx 时抛出带状态码的错误", async () => {
    fetchMock.mockResolvedValue(jsonResponse("bad key", false, 401));

    await expect(createOpenAiAdapter(baseConfig()).chat(messages)).rejects.toThrow(
      /OpenAI API error: 401/,
    );
  });

  it("chat 对缺失 choices 的响应回退为空串", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const result = await createOpenAiAdapter(baseConfig()).chat(messages);
    expect(result.content).toBe("");
    expect(result.usage).toBeUndefined();
  });

  it("chatStream 解析 SSE 增量并跳过 [DONE] 与坏 JSON", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([
        'data: {"choices":[{"delta":{"content":"你"}}]}\n',
        'data: {"choices":[{"delta":{"content":"好"}}]}\n',
        "data: not-json\n",
        "data: [DONE]\n",
      ]),
    );

    const cb = collect();
    await createOpenAiAdapter(baseConfig()).chatStream(messages, cb);

    expect(cb.tokens).toEqual(["你", "好"]);
    expect(cb.done).toEqual(["你好"]);
    expect(cb.errors).toEqual([]);
  });

  it("chatStream 透传 AbortSignal", async () => {
    fetchMock.mockResolvedValue(streamResponse([]));
    const controller = new AbortController();

    await createOpenAiAdapter(baseConfig()).chatStream(messages, {
      ...collect(),
      signal: controller.signal,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it("chatStream 把网络错误交给 onError 而不是抛出", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const cb = collect();
    await expect(
      createOpenAiAdapter(baseConfig()).chatStream(messages, cb),
    ).resolves.toBeUndefined();

    expect(cb.errors.map((e) => e.message)).toEqual(["network down"]);
    expect(cb.done).toEqual([]);
  });

  it("chatStream 在响应无 body 时报错", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, body: undefined });

    const cb = collect();
    await createOpenAiAdapter(baseConfig()).chatStream(messages, cb);

    expect(cb.errors[0]?.message).toBe("No response body");
  });
});

describe("阿里云通义千问适配器", () => {
  it("chat 命中 DashScope 文本生成端点", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ output: { choices: [{ message: { content: "答复" } }] } }),
    );

    const result = await createAliyunAdapter(baseConfig({ provider: "aliyun" })).chat(messages);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/services/aigc/text-generation/generation");
    expect(result.content).toBe("答复");
  });

  it("chatStream 开启 SSE 头并解析 output.choices 增量", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([
        'data:{"output":{"choices":[{"message":{"content":"增"}}]}}\n',
        'data:{"output":{"text":"量"}}\n',
        "data:\n",
      ]),
    );

    const cb = collect();
    await createAliyunAdapter(baseConfig({ provider: "aliyun" })).chatStream(messages, cb);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["X-DashScope-SSE"]).toBe("enable");
    expect(cb.tokens).toEqual(["增", "量"]);
    expect(cb.done).toEqual(["增量"]);
  });

  it("非 2xx 时错误信息标注 Aliyun", async () => {
    fetchMock.mockResolvedValue(jsonResponse("quota", false, 429));

    const cb = collect();
    await createAliyunAdapter(baseConfig({ provider: "aliyun" })).chatStream(messages, cb);

    expect(cb.errors[0]?.message).toMatch(/Aliyun API error: 429/);
  });
});

describe("Ollama 适配器", () => {
  it("chat 命中本地 /chat 端点且不带 Authorization", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: { content: "本地回复" } }));

    const result = await createOllamaAdapter(
      baseConfig({ provider: "ollama", apiKey: "", baseUrl: "http://localhost:11434/api" }),
    ).chat(messages);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/api/chat");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(result.content).toBe("本地回复");
  });

  it("chatStream 解析 NDJSON（每行一个 JSON，非 SSE）", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([
        '{"message":{"content":"a"}}\n{"message":{"content":"b"}}\n',
        "not-json\n",
        '{"message":{"content":"c"}}\n',
      ]),
    );

    const cb = collect();
    await createOllamaAdapter(baseConfig({ provider: "ollama" })).chatStream(messages, cb);

    expect(cb.tokens).toEqual(["a", "b", "c"]);
    expect(cb.done).toEqual(["abc"]);
  });
});

describe("createAiAdapter 工厂", () => {
  it("deepseek / custom 复用 OpenAI 兼容实现", () => {
    expect(createAiAdapter({ provider: "deepseek" }).provider).toBe("openai");
    expect(createAiAdapter({ provider: "custom" }).provider).toBe("openai");
  });

  it("按 provider 返回对应实现", () => {
    expect(createAiAdapter({ provider: "aliyun" }).provider).toBe("aliyun");
    expect(createAiAdapter({ provider: "ollama" }).provider).toBe("ollama");
  });

  it("未知 provider 抛出明确错误", () => {
    expect(() => createAiAdapter({ provider: "nope" as unknown as AiConfig["provider"] })).toThrow(
      /Unsupported AI provider/,
    );
  });
});

describe("网络分片落在行 / 字符中间", () => {
  it("OpenAI：被劈开的 SSE 行不会整条丢失", async () => {
    const line = 'data: {"choices":[{"delta":{"content":"hello"}}]}\n';
    fetchMock.mockResolvedValue(splitStreamResponse(line, 20));

    const cb = collect();
    await createOpenAiAdapter(baseConfig()).chatStream(messages, cb);

    expect(cb.tokens).toEqual(["hello"]);
    expect(cb.done).toEqual(["hello"]);
  });

  it("OpenAI：被劈开的多字节字符不会解成 U+FFFD", async () => {
    const line = 'data: {"choices":[{"delta":{"content":"你好世界"}}]}\n';
    // 在第一个中文字符的 3 个字节中间切开
    const at = new TextEncoder().encode(line.slice(0, line.indexOf("你"))).length + 1;
    fetchMock.mockResolvedValue(splitStreamResponse(line, at));

    const cb = collect();
    await createOpenAiAdapter(baseConfig()).chatStream(messages, cb);

    expect(cb.done).toEqual(["你好世界"]);
    expect(cb.done[0]).not.toContain("\uFFFD");
  });

  it("Aliyun：被劈开的 SSE 行不会整条丢失", async () => {
    const line = 'data:{"output":{"choices":[{"message":{"content":"增量"}}]}}\n';
    fetchMock.mockResolvedValue(splitStreamResponse(line, 25));

    const cb = collect();
    await createAliyunAdapter(baseConfig({ provider: "aliyun" })).chatStream(messages, cb);

    expect(cb.done).toEqual(["增量"]);
  });

  it("Ollama：被劈开的 NDJSON 行不会整条丢失", async () => {
    const line = '{"message":{"content":"本地"}}\n';
    fetchMock.mockResolvedValue(splitStreamResponse(line, 15));

    const cb = collect();
    await createOllamaAdapter(baseConfig({ provider: "ollama" })).chatStream(messages, cb);

    expect(cb.done).toEqual(["本地"]);
  });
});
