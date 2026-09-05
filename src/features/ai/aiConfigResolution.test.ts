import { describe, expect, it, test, vi } from "vitest";

import {
  createConfiguredAiClient,
  resolveAiExtensionOptions,
} from "@/features/ai/shared/extensionOptions";
import type { AiExtensionConfigureOptions } from "@/features/ai/shared/extensionOptions";

/**
 * 回归护栏：扩展 getter 层**不得**为缺省字段填兜底值。
 *
 * 一旦这里返回了带 provider 的对象，`client.ts` 的 `getAiConfig()` 就会认定
 * "宿主已托管"，从而跳过 localStorage / `.env` 回退分支——这正是此前
 * AI 设置弹窗存的配置完全不生效的原因。
 */
describe("resolveAiExtensionOptions", () => {
  const localeOnly: AiExtensionConfigureOptions = {
    getLocaleText: (key) => key,
  };

  test("宿主未注入 ai-config 时返回 null，让 client 继续走回退链", () => {
    expect(resolveAiExtensionOptions(localeOnly)).toBeNull();
  });

  /**
   * ⚠ 这三条锁的是 0.3.2 修过的一个洞：早先这里在「没有 provider」时无条件 return null，
   * 于是 `ai-config="{ demoMode: true }"` 根本传不到 client——而**没配 provider 正是
   * 演示模式唯一要生效的场景**。当时 client 层的测试直接 mock 了 resolveConfig，
   * 绕过了这段管道，所以假过。**测试要打在管道上，不是打在 mock 上。**
   */
  test("只给 demoMode、没有 provider 时也要透出去", () => {
    const options: AiExtensionConfigureOptions = { getDemoMode: () => true };
    expect(resolveAiExtensionOptions(options)).toEqual({ demoMode: true });
  });

  test("demoMode=false 同样是明确表态，不能被当成没配", () => {
    const options: AiExtensionConfigureOptions = { getDemoMode: () => false };
    expect(resolveAiExtensionOptions(options)).toEqual({ demoMode: false });
  });

  test("provider 与 demoMode 同时给时都带上", () => {
    const options: AiExtensionConfigureOptions = {
      getProvider: () => "openai",
      getDemoMode: () => true,
    };
    expect(resolveAiExtensionOptions(options)).toMatchObject({
      provider: "openai",
      demoMode: true,
    });
  });

  test("getProvider 返回 undefined 时同样返回 null", () => {
    const options: AiExtensionConfigureOptions = {
      getProvider: () => undefined,
      getApiKey: () => "sk-should-be-ignored",
    };
    expect(resolveAiExtensionOptions(options)).toBeNull();
  });

  test("宿主注入 provider 后原样透传，不补 endpoint / model / timeout", () => {
    const options: AiExtensionConfigureOptions = {
      getProvider: () => "deepseek",
      getApiKey: () => "sk-test",
    };

    expect(resolveAiExtensionOptions(options)).toEqual({
      provider: "deepseek",
      apiKey: "sk-test",
      endpoint: undefined,
      model: undefined,
      timeout: undefined,
      storageMode: undefined,
    });
  });

  test("proxy 模式透传 storageMode，供 isAiConfigured 放行空 apiKey", () => {
    const options: AiExtensionConfigureOptions = {
      getProvider: () => "openai",
      getEndpoint: () => "https://my-proxy.internal/v1",
      getStorageMode: () => "proxy",
    };

    expect(resolveAiExtensionOptions(options)).toMatchObject({
      provider: "openai",
      endpoint: "https://my-proxy.internal/v1",
      storageMode: "proxy",
      apiKey: undefined,
    });
  });

  test("每次调用都现取，宿主改 model 后下次请求即生效", () => {
    let model = "gpt-4o-mini";
    const options: AiExtensionConfigureOptions = {
      getProvider: () => "openai",
      getModel: () => model,
    };

    expect(resolveAiExtensionOptions(options)?.model).toBe("gpt-4o-mini");
    model = "gpt-4o";
    expect(resolveAiExtensionOptions(options)?.model).toBe("gpt-4o");
  });
});

describe("registry 的 AI capability getter", () => {
  async function configuredAiOptions(aiConfig: unknown) {
    const { CAPABILITIES } = await import("@/capabilities/registry");
    const { zhCN } = await import("@/locales/zh-CN");

    const aiCapability = CAPABILITIES.find((cap) => cap.id === "ai");
    expect(aiCapability).toBeDefined();

    const ctx = {
      locale: zhCN,
      gates: { ai: true },
      aiConfig: () => aiConfig,
    } as never;

    const extensions = await aiCapability!.extensions(ctx);
    // AiHighlightMark 无 AI options，取第一个带 getProvider 的扩展
    const withGetters = extensions.find(
      (ext) => typeof (ext.options as { getProvider?: unknown })?.getProvider === "function",
    );
    expect(withGetters).toBeDefined();
    return withGetters!.options as AiExtensionConfigureOptions;
  }

  test("未传 ai-config 时 getProvider 返回 undefined（而非默认 openai）", async () => {
    const options = await configuredAiOptions(undefined);

    expect(options.getProvider?.()).toBeUndefined();
    expect(options.getTimeout?.()).toBeUndefined();
    // 这是关键：整体解析为 null，client 才会去读 localStorage / .env
    expect(resolveAiExtensionOptions(options)).toBeNull();
  });

  test("传入 ai-config 时按原值透传", async () => {
    const options = await configuredAiOptions({
      provider: "deepseek",
      apiKey: "sk-host",
      model: "deepseek-chat",
      storageMode: "memory",
    });

    expect(resolveAiExtensionOptions(options)).toMatchObject({
      provider: "deepseek",
      apiKey: "sk-host",
      model: "deepseek-chat",
      storageMode: "memory",
    });
  });
});

describe("createConfiguredAiClient", () => {
  it("把实例 locale 解析器透传给 client —— 否则 client 自己的提示会是英文兜底", async () => {
    vi.stubEnv("VITE_AI_DEMO_MODE", "false");
    const errors: Error[] = [];

    createConfiguredAiClient({
      // 不给 provider：走「未配置」分支，正好检验文案来源
      getLocaleText: (key) => (key === "messages.aiNotConfigured" ? "缺少 API Key" : key),
    }).polish("t", "ctx", { onError: (e) => errors.push(e) });

    await vi.waitFor(() => expect(errors.length).toBe(1));
    expect(errors[0].message).toBe("缺少 API Key");

    vi.unstubAllEnvs();
  });
});
