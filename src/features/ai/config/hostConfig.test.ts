import { beforeEach, describe, expect, it, vi } from "vitest";

import type { YanivEditorAiConfig } from "@/core/editorTypes";

import {
  getHostAiConfig,
  isHostAiManaged,
  resetHostAiConfigs,
  setHostAiConfig,
} from "./hostConfig";

const configA: YanivEditorAiConfig = {
  provider: "openai",
  apiKey: "key-a",
  model: "gpt-4o-mini",
};
const configB: YanivEditorAiConfig = {
  provider: "deepseek",
  apiKey: "key-b",
  model: "deepseek-chat",
};

beforeEach(() => {
  resetHostAiConfigs();
  vi.restoreAllMocks();
});

/**
 * 多实例隔离回归。
 *
 * 旧实现是单个模块级变量：同页两个编辑器，后挂载者会覆盖先挂载者；
 * 未传 ai-config 的实例还会静默复用别人的密钥与端点。
 */
describe("hostAiConfig 的多实例隔离", () => {
  it("按 owner 分别登记，互不覆盖", () => {
    const ownerA = Symbol("a");
    const ownerB = Symbol("b");

    setHostAiConfig(configA, ownerA);
    setHostAiConfig(configB, ownerB);

    expect(getHostAiConfig(ownerA)?.apiKey).toBe("key-a");
    expect(getHostAiConfig(ownerB)?.apiKey).toBe("key-b");
    expect(getHostAiConfig(ownerA)?.provider).toBe("openai");
    expect(getHostAiConfig(ownerB)?.provider).toBe("deepseek");
  });

  it("未登记的实例查不到任何配置 —— 不会串用别人的密钥", () => {
    setHostAiConfig(configA, Symbol("a"));
    const outsider = Symbol("no-ai-config");

    expect(getHostAiConfig(outsider)).toBeNull();
    expect(isHostAiManaged(outsider)).toBe(false);
  });

  it("卸载一个实例不影响其他实例", () => {
    const ownerA = Symbol("a");
    const ownerB = Symbol("b");
    setHostAiConfig(configA, ownerA);
    setHostAiConfig(configB, ownerB);

    setHostAiConfig(null, ownerA);

    expect(getHostAiConfig(ownerA)).toBeNull();
    expect(getHostAiConfig(ownerB)?.apiKey).toBe("key-b");
  });

  it("单实例时无 owner 查询仍可用（旧调用方兼容）", () => {
    setHostAiConfig(configA, Symbol("only"));

    expect(isHostAiManaged()).toBe(true);
    expect(getHostAiConfig()?.apiKey).toBe("key-a");
  });

  it("多实例时无 owner 查询返回 null 并告警，而不是任选一个", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setHostAiConfig(configA, Symbol("a"));
    setHostAiConfig(configB, Symbol("b"));

    expect(getHostAiConfig()).toBeNull();
    expect(isHostAiManaged()).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("归一化补齐 provider 默认端点与模型", () => {
    const owner = Symbol("a");
    setHostAiConfig({ provider: "aliyun" }, owner);

    const resolved = getHostAiConfig(owner);
    expect(resolved?.endpoint).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(resolved?.model).toBe("qwen-plus");
    expect(resolved?.storageMode).toBe("memory");
    expect(resolved?.enabled).toBe(true);
  });
});
