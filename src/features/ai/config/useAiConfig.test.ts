import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetHostAiConfigs, setHostAiConfig } from "./hostConfig";
import { getAiConfigStore } from "./store";
import { getAiRequestConfig, isHostAiManaged, useAiConfig } from "./useAiConfig";

import type { AiUserConfig } from "./types";

function config(overrides: Partial<AiUserConfig> = {}): AiUserConfig {
  return {
    provider: "openai",
    apiKey: "sk-test",
    storageMode: "memory",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    timeout: 60000,
    enabled: true,
    updatedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  resetHostAiConfigs();
  getAiConfigStore().clearConfig();
});

afterEach(() => {
  localStorage.clear();
  resetHostAiConfigs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getAiRequestConfig 解析", () => {
  it("无任何配置时返回 null", () => {
    expect(getAiRequestConfig()).toBeNull();
  });

  it("宿主托管时优先返回宿主配置", () => {
    setHostAiConfig({ provider: "deepseek", apiKey: "sk-host" }, Symbol("owner"));

    const resolved = getAiRequestConfig();
    expect(resolved?.provider).toBe("deepseek");
    expect(resolved?.apiKey).toBe("sk-host");
    expect(isHostAiManaged()).toBe(true);
  });

  it("无宿主配置时回退到 localStorage", () => {
    getAiConfigStore().saveConfig(config({ provider: "aliyun", apiKey: "sk-store" }));

    const resolved = getAiRequestConfig();
    expect(resolved?.provider).toBe("aliyun");
    expect(resolved?.apiKey).toBe("sk-store");
  });

  it("enabled=false 的配置不参与请求", () => {
    getAiConfigStore().saveConfig(config({ enabled: false }));
    expect(getAiRequestConfig()).toBeNull();
  });

  it("缺少必需密钥时返回 null", () => {
    getAiConfigStore().saveConfig(config({ apiKey: "" }));
    expect(getAiRequestConfig()).toBeNull();
  });

  it("proxy 模式无密钥仍可用", () => {
    getAiConfigStore().saveConfig(config({ storageMode: "proxy", apiKey: "" }));
    expect(getAiRequestConfig()).not.toBeNull();
  });

  it("custom provider 缺 endpoint 时返回 null", () => {
    getAiConfigStore().saveConfig(config({ provider: "custom", endpoint: "" }));
    expect(getAiRequestConfig()).toBeNull();
  });

  it("缺省字段由 provider 默认值补齐", () => {
    getAiConfigStore().saveConfig(config({ provider: "deepseek", endpoint: "", model: "" }));

    const resolved = getAiRequestConfig();
    expect(resolved?.endpoint).toBe("https://api.deepseek.com");
    expect(resolved?.model).toBe("deepseek-chat");
  });
});

describe("useAiConfig composable", () => {
  it("初始为空配置", () => {
    const { config: current, isConfigured, isEnabled } = useAiConfig();
    expect(current.value).toBeNull();
    expect(isConfigured.value).toBe(false);
    expect(isEnabled.value).toBe(false);
  });

  it("saveConfig 后状态与存储同步", () => {
    const api = useAiConfig();
    api.saveConfig(config({ provider: "aliyun" }));

    expect(api.config.value?.provider).toBe("aliyun");
    expect(api.isConfigured.value).toBe(true);
    expect(getAiConfigStore().getConfig()?.provider).toBe("aliyun");
  });

  it("updateConfig 只覆盖传入字段", () => {
    const api = useAiConfig();
    api.saveConfig(config({ model: "gpt-4o-mini" }));
    api.updateConfig({ model: "gpt-4o" });

    expect(api.config.value?.model).toBe("gpt-4o");
    expect(api.config.value?.apiKey).toBe("sk-test");
  });

  it("setProvider 同时切换默认端点与模型", () => {
    const api = useAiConfig();
    api.saveConfig(config());
    api.setProvider("ollama");

    expect(api.config.value?.provider).toBe("ollama");
    expect(api.config.value?.endpoint).toBe("http://localhost:11434/api");
    expect(api.config.value?.model).toBe("llama3.2");
  });

  it("未知 provider 被忽略", () => {
    const api = useAiConfig();
    api.saveConfig(config({ provider: "openai" }));
    api.setProvider("nope" as AiUserConfig["provider"]);

    expect(api.config.value?.provider).toBe("openai");
  });

  it("clearConfig 复位全部状态", () => {
    const api = useAiConfig();
    api.saveConfig(config());
    api.clearConfig();

    expect(api.config.value).toBeNull();
    expect(api.testStatus.value).toBe("idle");
  });

  it("providers 暴露全部内置提供商", () => {
    const ids = useAiConfig().providers.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(["openai", "deepseek", "aliyun", "ollama", "custom"]),
    );
  });
});

describe("连接测试", () => {
  it("未配置时直接返回失败", async () => {
    const api = useAiConfig();
    const result = await api.testConnection();

    expect(result.success).toBe(false);
  });

  it("缺少 API Key 时不发起请求", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const api = useAiConfig();
    const result = await api.testConnection(config({ apiKey: "" }));

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("成功响应记为 success 并带上耗时", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }),
    );

    const api = useAiConfig();
    const result = await api.testConnection(config());

    expect(result.success).toBe(true);
    expect(result.latency).toBeGreaterThanOrEqual(0);
    expect(api.testStatus.value).toBe("success");
  });

  it("非 2xx 响应记为 error 并透出上游报错文案", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Invalid API key" } }),
      }),
    );

    const api = useAiConfig();
    const result = await api.testConnection(config());

    expect(result.success).toBe(false);
    // 上游报错无法本地化，走 detail 原样透出；messageKey 只给通用「连接失败」
    expect(result.detail).toContain("Invalid API key");
    expect(result.messageKey).toBe("aiSettings.testFailed");
    expect(api.testStatus.value).toBe("error");
  });

  it("超时被识别为超时而非普通失败", async () => {
    const timeoutError = new Error("timeout");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    const result = await useAiConfig().testConnection(config());
    expect(result.success).toBe(false);
    // 只回 key，不回文案 —— 翻译在 AiSettingsModal 做，否则英文界面会混出中文
    expect(result.messageKey).toBe("aiSettings.testTimeout");
  });

  it("ollama 走 /api/tags 探活且不带密钥", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await useAiConfig().testConnection(
      config({ provider: "ollama", apiKey: "", endpoint: "http://localhost:11434/api" }),
    );

    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/tags");
    expect(init.method).toBe("GET");
  });

  it("未知 provider 直接失败", async () => {
    const result = await useAiConfig().testConnection(
      config({ provider: "nope" as AiUserConfig["provider"] }),
    );
    expect(result.success).toBe(false);
  });

  it("缺少 endpoint 时提示补端点", async () => {
    const result = await useAiConfig().testConnection(config({ provider: "custom", endpoint: "" }));
    expect(result.success).toBe(false);
  });
});

describe("useAiConfig 的响应式派生量", () => {
  it("isConfigured 跟随 saveConfig / clearConfig 变化", () => {
    const api = useAiConfig();
    api.clearConfig();
    expect(api.isConfigured.value).toBe(false);

    api.saveConfig(config());
    // 回归：曾经写成 computed(() => store.isConfigured())，读的是 localStorage /
    // 模块级变量，Vue 追踪不到依赖，首次求值后永久缓存在 false。
    expect(api.isConfigured.value).toBe(true);

    api.clearConfig();
    expect(api.isConfigured.value).toBe(false);
  });

  it("isConfigured 与 store.isConfigured() 判定一致", () => {
    const api = useAiConfig();
    const store = getAiConfigStore();

    // 缺 apiKey 且非 proxy —— 两边都应判为未配置
    api.saveConfig(config({ apiKey: "", storageMode: "memory" }));
    expect(api.isConfigured.value).toBe(false);
    expect(store.isConfigured()).toBe(false);

    // proxy 模式下前端本就没有 apiKey，仍算已配置
    api.saveConfig(config({ apiKey: "", storageMode: "proxy" }));
    expect(api.isConfigured.value).toBe(true);
    expect(store.isConfigured()).toBe(true);

    // enabled=false 一票否决
    api.saveConfig(config({ enabled: false }));
    expect(api.isConfigured.value).toBe(false);
    expect(store.isConfigured()).toBe(false);

    // custom 必须显式填 endpoint
    api.saveConfig(config({ provider: "custom", endpoint: "" }));
    expect(api.isConfigured.value).toBe(false);
    expect(store.isConfigured()).toBe(false);

    api.clearConfig();
  });
});
