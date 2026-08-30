import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAiConfigStore, getAiConfigStore } from "./store";

import type { AiUserConfig } from "./types";

function config(overrides: Partial<AiUserConfig> = {}): AiUserConfig {
  return {
    provider: "openai",
    apiKey: "sk-secret",
    storageMode: "local",
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
  // 上一条用例可能把密钥留在模块内存里
  createAiConfigStore().clearConfig();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("配置读写", () => {
  it("未配置时返回 null", () => {
    expect(createAiConfigStore().getConfig()).toBeNull();
    expect(createAiConfigStore().isConfigured()).toBe(false);
  });

  it("保存后可完整读回", () => {
    const store = createAiConfigStore();
    store.saveConfig(config());

    const loaded = store.getConfig();
    expect(loaded?.provider).toBe("openai");
    expect(loaded?.model).toBe("gpt-4o-mini");
    expect(loaded?.apiKey).toBe("sk-secret");
  });

  it("clearConfig 清空全部痕迹", () => {
    const store = createAiConfigStore();
    store.saveConfig(config());
    store.clearConfig();

    expect(store.getConfig()).toBeNull();
    expect(store.getApiKey()).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});

describe("密钥存储模式", () => {
  it("local：密钥落盘但不以明文形式存在", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ storageMode: "local", apiKey: "sk-plain-secret" }));

    const raw = JSON.stringify(localStorage);
    expect(raw).not.toContain("sk-plain-secret");
    expect(store.getApiKey()).toBe("sk-plain-secret");
  });

  it("memory：密钥不进 localStorage，仅当前会话可读", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ storageMode: "memory", apiKey: "sk-mem" }));

    expect(JSON.stringify(localStorage)).not.toContain("sk-mem");
    expect(store.getApiKey()).toBe("sk-mem");
  });

  it("proxy：前端不保存任何密钥", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ storageMode: "proxy", apiKey: "" }));

    expect(store.getApiKey()).toBeNull();
  });

  it("落盘配置里不含 apiKey 字段", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ storageMode: "local" }));

    const stored = Object.values({ ...localStorage })
      .filter((v): v is string => typeof v === "string")
      .find((v) => v.includes("provider"));

    expect(stored).toBeDefined();
    expect(JSON.parse(stored!)).not.toHaveProperty("apiKey");
  });
});

describe("isConfigured 判定", () => {
  it("enabled=false 视为未配置", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ enabled: false }));
    expect(store.isConfigured()).toBe(false);
  });

  it("需要密钥的 provider 缺 apiKey 时未配置", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ storageMode: "memory", apiKey: "" }));
    expect(store.isConfigured()).toBe(false);
  });

  it("proxy 模式无 apiKey 也算已配置（密钥在后端）", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ storageMode: "proxy", apiKey: "" }));
    expect(store.isConfigured()).toBe(true);
  });

  it("custom provider 缺 endpoint 时未配置", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ provider: "custom", endpoint: "" }));
    expect(store.isConfigured()).toBe(false);

    store.saveConfig(config({ provider: "custom", endpoint: "https://my-proxy/v1" }));
    expect(store.isConfigured()).toBe(true);
  });

  it("ollama 无需密钥即已配置", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ provider: "ollama", apiKey: "", storageMode: "memory" }));
    expect(store.isConfigured()).toBe(true);
  });

  it("未知 provider 视为未配置", () => {
    const store = createAiConfigStore();
    store.saveConfig(config({ provider: "nope" as AiUserConfig["provider"] }));
    expect(store.isConfigured()).toBe(false);
  });
});

describe("存储异常与脏数据容错", () => {
  it("localStorage 写入抛出（隐私模式 / 配额满）时不冒泡", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => createAiConfigStore().saveConfig(config())).not.toThrow();
  });

  it("localStorage 读取抛出时降级为未配置", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(createAiConfigStore().getConfig()).toBeNull();
  });

  it("存储内容不是合法 JSON 时返回 null 而不是崩溃", () => {
    const store = createAiConfigStore();
    store.saveConfig(config());

    const key = Object.keys({ ...localStorage }).find((k) =>
      localStorage.getItem(k)?.includes("provider"),
    );
    localStorage.setItem(key!, "{not json");

    expect(store.getConfig()).toBeNull();
  });
});

describe("getAiConfigStore 单例", () => {
  it("多次调用返回同一实例", () => {
    expect(getAiConfigStore()).toBe(getAiConfigStore());
  });
});
