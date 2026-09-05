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
  /**
   * ai-config.demoMode 是接入方**唯一真正可用**的演示开关：构建期 VITE_AI_DEMO_MODE
   * 在库构建时就被 vite 静态替换，冻结的是发布者的值，对已发布的 npm 包永远不生效
   * （0.3.0 因此把 demo 模式恒开发了出去）。这三个用例锁住新的优先级，别改回去。
   */
  it("宿主 ai-config.demoMode=true 时走模拟流（构建期变量为 false 也照样生效）", async () => {
    vi.stubEnv("VITE_AI_DEMO_MODE", "false");

    const { cb, errors, done } = collect();
    createAiClient({ resolveConfig: () => ({ demoMode: true }) }).polish("t", "ctx", cb);

    await vi.waitFor(() => expect(done.length + errors.length).toBeGreaterThan(0), {
      timeout: 5000,
    });
    expect(errors).toHaveLength(0);

    vi.unstubAllEnvs();
  });

  it("宿主 ai-config.demoMode=false 时报错（能压过构建期变量的 true）", async () => {
    vi.stubEnv("VITE_AI_DEMO_MODE", "true");

    const { cb, errors } = collect();
    createAiClient({ resolveConfig: () => ({ demoMode: false }) }).polish("t", "ctx", cb);

    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0].message).toMatch(/API Key/);

    vi.unstubAllEnvs();
  });

  it("宿主没表态时才回落到构建期变量", async () => {
    vi.stubEnv("VITE_AI_DEMO_MODE", "true");

    const { cb, errors, done } = collect();
    // demoMode 缺省（undefined）⟹ 不算表态，继续往下一级找
    createAiClient({ resolveConfig: () => ({}) }).polish("t", "ctx", cb);

    await vi.waitFor(() => expect(done.length + errors.length).toBeGreaterThan(0), {
      timeout: 5000,
    });
    expect(errors).toHaveLength(0);

    vi.unstubAllEnvs();
  });

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

/**
 * 回归护栏：`VITE_AI_TEMPERATURE` / `VITE_AI_MAX_TOKENS` 必须真的进请求体。
 *
 * 这两个变量此前是死配置：`loadAiConfig()` 读了，但 `getAiConfig()` 的返回类型不带它们，
 * `resolveAdapter()` 也只传 provider / apiKey / baseUrl / model，最终永远用
 * `createAiConfig()` 的默认值 0.7 / 2048。下面两条把「读到」和「送达」都钉死。
 */
describe("模型调参（temperature / maxTokens）", () => {
  function stubStream() {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("构建期变量进入请求体", async () => {
    vi.stubEnv("VITE_AI_TEMPERATURE", "0.15");
    vi.stubEnv("VITE_AI_MAX_TOKENS", "321");
    const fetchMock = stubStream();

    createAiClient({
      resolveConfig: () => ({ provider: "openai", apiKey: "sk-x" }),
    }).polish("t", "ctx", collect().cb);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.temperature).toBe(0.15);
    expect(body.max_tokens).toBe(321);
  });

  it("凭据来自更高优先级时，调参仍取构建期变量", async () => {
    // 这正是此前的失效形态：用户在 AI 设置里配过 key，凭据走第 2 级，
    // 若调参也跟着分级就会永远拿不到 .env 里的值。
    vi.stubEnv("VITE_AI_TEMPERATURE", "0.9");
    getAiConfigStore().saveConfig({
      provider: "openai",
      apiKey: "sk-from-dialog",
      storageMode: "memory",
      endpoint: "https://api.example.com/v1",
      model: "gpt-4o-mini",
      timeout: 60000,
      enabled: true,
      updatedAt: Date.now(),
    });
    const fetchMock = stubStream();

    createAiClient().polish("t", "ctx", collect().cb);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.temperature).toBe(0.9);
    expect(body.max_tokens).toBe(2048); // 未设环境变量时用内置默认值
  });

  it("环境变量不是数字时退回默认值，而不是把 NaN 发出去", async () => {
    vi.stubEnv("VITE_AI_TEMPERATURE", "hot");
    const fetchMock = stubStream();

    createAiClient({
      resolveConfig: () => ({ provider: "openai", apiKey: "sk-x" }),
    }).polish("t", "ctx", collect().cb);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.temperature).toBe(0.7);
  });
});

/**
 * 回归护栏：client 自己产出的文案必须跟随实例 locale。
 *
 * 这些串此前写死在 `client.ts` 里（「请先在工具栏 AI 设置中配置 API Key…」「AI 请求失败」
 * 以及 5 段 demo 流式文案），en-US 的编辑器也照样弹中文。
 */
describe("client 文案跟随实例 locale", () => {
  const zh = (key: string) =>
    ({
      "messages.aiNotConfigured": "请先配置 API Key",
      "messages.aiRequestFailed": "AI 请求失败",
      "aiDemo.polish": "润色演示",
    })[key] ?? key;

  beforeEach(() => {
    // 本地 .env 里可能开着演示模式；显式关掉，让「未配置」走报错分支
    vi.stubEnv("VITE_AI_DEMO_MODE", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未配置时用注入的 locale 文案报错", async () => {
    const { errors, cb } = collect();
    createAiClient({ getLocaleText: zh }).polish("t", "ctx", cb);
    await vi.waitFor(() => expect(errors.length).toBe(1));
    expect(errors[0].message).toBe("请先配置 API Key");
  });

  it("未注入 locale 时退回英文兜底，而不是暴露原始 key", async () => {
    const { errors, cb } = collect();
    createAiClient().polish("t", "ctx", cb);
    await vi.waitFor(() => expect(errors.length).toBe(1));
    expect(errors[0].message).toContain("API Key");
    expect(errors[0].message).not.toContain("messages.");
  });

  it("demo 模式流式输出走 locale", async () => {
    vi.stubEnv("VITE_AI_DEMO_MODE", "true");
    const { done, cb } = collect();

    createAiClient({ getLocaleText: zh }).polish("t", "ctx", cb);

    await vi.waitFor(() => expect(done.length).toBe(1), { timeout: 3000 });
    expect(done[0]).toBe("润色演示");
  });

  it("adapter 抛出非 Error 时用 locale 的兜底文案", async () => {
    const adapter = {
      provider: "openai",
      chat: () => Promise.resolve({ content: "" }),
      // 故意 reject 非 Error：本用例检验的就是 normalizeAiError 对这类值的处理
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      chatStream: () => Promise.reject("boom-not-an-error"),
    } as unknown as AiAdapter;
    const { errors, cb } = collect();

    createAiClient({ adapter, getLocaleText: zh }).polish("t", "ctx", cb);

    await vi.waitFor(() => expect(errors.length).toBe(1));
    // 字符串被原样包成 Error；换成非字符串才会用到兜底
    expect(errors[0].message).toBe("boom-not-an-error");

    const adapter2 = {
      provider: "openai",
      chat: () => Promise.resolve({ content: "" }),
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      chatStream: () => Promise.reject({ code: 500 }),
    } as unknown as AiAdapter;
    const second = collect();
    createAiClient({ adapter: adapter2, getLocaleText: zh }).polish("t", "ctx", second.cb);

    await vi.waitFor(() => expect(second.errors.length).toBe(1));
    expect(second.errors[0].message).toBe("AI 请求失败");
  });
});
