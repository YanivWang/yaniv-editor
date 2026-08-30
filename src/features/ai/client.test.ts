import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAiClient, normalizeAiError } from "./client";
import { resetHostAiConfigs } from "./config/hostConfig";
import { getAiConfigStore } from "./config/store";

import type { AiAdapter, AiMessage, AiStreamCallbacks } from "./types";

/** 记录收到的调用，便于断言 prompt 组装与配置解析 */
function makeAdapter() {
  const calls: { messages: AiMessage[]; callbacks: AiStreamCallbacks }[] = [];
  const adapter: AiAdapter = {
    provider: "openai",
    chat: () => Promise.resolve({ content: "" }),
    chatStream: (messages: AiMessage[], callbacks: AiStreamCallbacks) => {
      calls.push({ messages, callbacks });
      callbacks.onStart?.();
      callbacks.onToken?.("ok");
      callbacks.onComplete?.("ok");
      return Promise.resolve();
    },
  } as unknown as AiAdapter;
  return { adapter, calls };
}

function collect() {
  const tokens: string[] = [];
  const errors: Error[] = [];
  const done: string[] = [];
  return {
    tokens,
    errors,
    done,
    cb: {
      onToken: (t: string) => tokens.push(t),
      onError: (e: Error) => errors.push(e),
      onComplete: (full: string) => done.push(full),
    } as AiStreamCallbacks,
  };
}

beforeEach(() => {
  localStorage.clear();
  resetHostAiConfigs();
  getAiConfigStore().clearConfig();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("normalizeAiError", () => {
  it("Error 原样返回", () => {
    const err = new Error("boom");
    expect(normalizeAiError(err)).toBe(err);
  });

  it("字符串包装为 Error", () => {
    expect(normalizeAiError("bad").message).toBe("bad");
  });

  it("其他类型给出兜底文案", () => {
    expect(normalizeAiError({ code: 500 }).message).toBeTruthy();
    expect(normalizeAiError(null).message).toBeTruthy();
  });
});

describe("传入固定 adapter 时绕开全局配置", () => {
  it("continueWriting 组装 system + user 两条消息", () => {
    const { adapter, calls } = makeAdapter();
    const { cb, tokens, done } = collect();

    createAiClient({ adapter }).continueWriting("正文内容", "文档上下文", cb);

    expect(calls).toHaveLength(1);
    const [system, user] = calls[0].messages;
    expect(system.role).toBe("system");
    expect(system.content).toContain("文档上下文");
    expect(user).toEqual({ role: "user", content: "正文内容" });
    expect(tokens).toEqual(["ok"]);
    expect(done).toEqual(["ok"]);
  });

  it.each([
    ["polish", (c: ReturnType<typeof createAiClient>) => c.polish("t", "ctx", collect().cb)],
    ["summarize", (c: ReturnType<typeof createAiClient>) => c.summarize("t", "ctx", collect().cb)],
  ])("%s 也走同一条流式通道", (_name, invoke) => {
    const { adapter, calls } = makeAdapter();
    invoke(createAiClient({ adapter }));
    expect(calls).toHaveLength(1);
  });

  it("translate 把目标语言写进 system prompt", () => {
    const { adapter, calls } = makeAdapter();
    createAiClient({ adapter }).translate("hello", "en-US", "ctx", collect().cb);

    expect(calls[0].messages[0].content).toContain("目标语言");
  });

  it("customCommand 把用户指令写进 system prompt", () => {
    const { adapter, calls } = makeAdapter();
    createAiClient({ adapter }).customCommand("正文", "改写成正式语气", "ctx", collect().cb);

    expect(calls[0].messages[0].content).toContain("改写成正式语气");
  });

  it("adapter 抛出时转成 onError，不冒泡", async () => {
    const failing = {
      provider: "openai",
      chat: () => Promise.resolve({ content: "" }),
      chatStream: () => Promise.reject(new Error("upstream")),
    } as unknown as AiAdapter;

    const { cb, errors } = collect();
    createAiClient({ adapter: failing }).polish("t", "ctx", cb);
    await vi.waitFor(() => expect(errors).toHaveLength(1));

    expect(errors[0].message).toBe("upstream");
  });

  it("已中止的 signal 直接完成，不发请求", async () => {
    const { adapter, calls } = makeAdapter();
    const controller = new AbortController();
    controller.abort();

    const { done } = collect();
    const cb: AiStreamCallbacks = { onComplete: (f) => done.push(f), signal: controller.signal };
    createAiClient({ adapter }).polish("t", "ctx", cb);

    await vi.waitFor(() => expect(done).toEqual([""]));
    expect(calls).toHaveLength(0);
  });
});

describe("未配置时的两条分支", () => {
  it("演示模式关闭时给出可操作的错误提示", async () => {
    vi.stubEnv("VITE_AI_DEMO_MODE", "false");

    const { cb, errors } = collect();
    createAiClient({ resolveConfig: () => null }).polish("t", "ctx", cb);

    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0].message).toMatch(/API Key/);

    vi.unstubAllEnvs();
  });

  it("演示模式开启时改为模拟流式输出，而不是报错", async () => {
    vi.stubEnv("VITE_AI_DEMO_MODE", "true");

    const { cb, errors, done } = collect();
    createAiClient({ resolveConfig: () => null }).polish("t", "ctx", cb);

    await vi.waitFor(() => expect(done.length + errors.length).toBeGreaterThan(0), {
      timeout: 5000,
    });
    expect(errors).toHaveLength(0);

    vi.unstubAllEnvs();
  });
});

describe("配置解析优先级", () => {
  it("resolveConfig 带 provider 时视为宿主托管，跳过 localStorage", async () => {
    getAiConfigStore().saveConfig({
      provider: "deepseek",
      apiKey: "sk-from-storage",
      storageMode: "memory",
      endpoint: "https://storage.example.com",
      model: "storage-model",
      timeout: 60000,
      enabled: true,
      updatedAt: Date.now(),
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    });
    vi.stubGlobal("fetch", fetchMock);

    createAiClient({
      resolveConfig: () => ({
        provider: "openai",
        apiKey: "sk-from-host",
        endpoint: "https://host.example.com/v1",
        model: "host-model",
      }),
    }).polish("t", "ctx", collect().cb);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("host.example.com");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-from-host");
    expect(JSON.parse(init.body as string).model).toBe("host-model");

    vi.unstubAllGlobals();
  });

  it("resolveConfig 返回 null 时回退到 localStorage 配置", async () => {
    getAiConfigStore().saveConfig({
      provider: "deepseek",
      apiKey: "sk-from-storage",
      storageMode: "local",
      endpoint: "https://storage.example.com",
      model: "storage-model",
      timeout: 60000,
      enabled: true,
      updatedAt: Date.now(),
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    });
    vi.stubGlobal("fetch", fetchMock);

    createAiClient({ resolveConfig: () => null }).polish("t", "ctx", collect().cb);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("storage.example.com");

    vi.unstubAllGlobals();
  });

  it("宿主只给 provider 时，端点与模型由默认值补齐", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    });
    vi.stubGlobal("fetch", fetchMock);

    createAiClient({
      resolveConfig: () => ({ provider: "deepseek", apiKey: "sk-x" }),
    }).polish("t", "ctx", collect().cb);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toContain("api.deepseek.com");
    expect(JSON.parse(init.body as string).model).toBe("deepseek-chat");

    vi.unstubAllGlobals();
  });

  it("proxy 模式无 apiKey 仍判定为已配置", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    });
    vi.stubGlobal("fetch", fetchMock);

    createAiClient({
      resolveConfig: () => ({
        provider: "custom",
        storageMode: "proxy",
        endpoint: "https://my-backend/ai",
      }),
    }).polish("t", "ctx", collect().cb);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("my-backend");

    vi.unstubAllGlobals();
  });
});
