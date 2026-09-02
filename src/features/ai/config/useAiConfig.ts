/**
 * AI Configuration Composable
 * @description Vue Composable for AI 配置管理
 */

import { ref, computed, shallowReadonly } from "vue";

import { getHostAiConfig, isHostAiManaged } from "./hostConfig";
import { getAiConfigStore } from "./store";
import { DEFAULT_CONFIG, getProviderInfo, isUsableAiConfig, AI_PROVIDERS } from "./types";

import type { AiUserConfig, AiProvider, AiConfigState, ConnectionTestResult } from "./types";

/** 全局响应式状态 */
const state = ref<AiConfigState>({
  config: null,
  initialized: false,
  testStatus: "idle",
  testError: null,
});

/** 初始化标志 */
let isInitialized = false;

/**
 * 初始化配置
 */
function initConfig(): void {
  if (isInitialized) return;

  const store = getAiConfigStore();
  const savedConfig = store.getConfig();

  if (savedConfig) {
    state.value.config = savedConfig;
  }

  state.value.initialized = true;
  isInitialized = true;
}

/**
 * 测试 API 连接。
 *
 * 返回的是**语言包 key**（`aiSettings.*`）而不是文案：本 composable 没有 locale 上下文，
 * 翻译交给持有 `useEditorT()` 的 `AiSettingsModal`。provider 回的原始错误无法本地化，
 * 走 `detail` 原样透出。
 */
async function testAiConnection(config: AiUserConfig): Promise<ConnectionTestResult> {
  const providerInfo = getProviderInfo(config.provider);
  if (!providerInfo) {
    return { success: false, messageKey: "aiSettings.testUnknownProvider" };
  }

  // 检查必要参数
  if (providerInfo.requiresApiKey && config.storageMode !== "proxy" && !config.apiKey) {
    return { success: false, messageKey: "aiSettings.testMissingApiKey" };
  }

  const endpoint = config.endpoint || providerInfo.defaultEndpoint;
  if (!endpoint) {
    return { success: false, messageKey: "aiSettings.testMissingEndpoint" };
  }

  const startTime = Date.now();

  try {
    // 构建测试请求
    let testUrl = endpoint;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.provider === "ollama") {
      // Ollama 使用 /api/tags 测试
      testUrl = endpoint.replace(/\/api\/?$/, "") + "/api/tags";
      const response = await fetch(testUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const latency = Date.now() - startTime;
      return { success: true, messageKey: "aiSettings.testSuccess", latency };
    }

    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
    testUrl = endpoint.replace(/\/$/, "") + "/chat/completions";
    const testBody = JSON.stringify({
      model: config.model || providerInfo.defaultModel,
      max_tokens: 1,
      messages: [{ role: "user", content: "Hi" }],
    });

    const response = await fetch(testUrl, {
      method: "POST",
      headers,
      body: testBody,
      signal: AbortSignal.timeout(15000),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      return { success: false, messageKey: "aiSettings.testFailed", detail, latency };
    }

    return { success: true, messageKey: "aiSettings.testSuccess", latency };
  } catch (error) {
    const latency = Date.now() - startTime;
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return { success: false, messageKey: "aiSettings.testTimeout", latency };
      }
      return {
        success: false,
        messageKey: "aiSettings.testFailed",
        detail: error.message,
        latency,
      };
    }
    return { success: false, messageKey: "aiSettings.testFailed", latency };
  }
}

/**
 * useAiConfig Composable
 */
export function useAiConfig() {
  // 确保初始化
  initConfig();

  const store = getAiConfigStore();

  // 计算属性
  const config = computed(() => state.value.config);
  /**
   * 必须从响应式 `state` 推导，**不能**调 `store.isConfigured()`：
   * 那个方法读的是 localStorage / 模块级变量，Vue 追踪不到，computed 会因为
   * 没有任何依赖而在首次求值后永久缓存 —— 用户在设置弹窗里存好配置，
   * 这里仍旧回 false。
   */
  const isConfigured = computed(() => isUsableAiConfig(state.value.config));
  const isEnabled = computed(() => state.value.config?.enabled ?? false);
  const currentProvider = computed(() => state.value.config?.provider ?? "openai");
  const currentProviderInfo = computed(() => getProviderInfo(currentProvider.value));
  const testStatus = computed(() => state.value.testStatus);
  const testError = computed(() => state.value.testError);

  /**
   * 保存配置
   */
  function saveConfig(newConfig: AiUserConfig): void {
    store.saveConfig(newConfig);
    state.value.config = newConfig;
    state.value.testStatus = "idle";
    state.value.testError = null;
  }

  /**
   * 更新部分配置
   */
  function updateConfig(partial: Partial<AiUserConfig>): void {
    const current = state.value.config || {
      ...DEFAULT_CONFIG,
      apiKey: "",
      updatedAt: Date.now(),
    };
    saveConfig({ ...current, ...partial });
  }

  /**
   * 切换提供商
   */
  function setProvider(provider: AiProvider): void {
    const providerInfo = getProviderInfo(provider);
    if (!providerInfo) return;

    updateConfig({
      provider,
      endpoint: providerInfo.defaultEndpoint,
      model: providerInfo.defaultModel,
    });
  }

  /**
   * 测试连接
   */
  async function testConnectionAsync(configOverride?: AiUserConfig): Promise<ConnectionTestResult> {
    const currentConfig = configOverride ?? state.value.config;
    if (!currentConfig) {
      return { success: false, messageKey: "aiSettings.testNotConfigured" };
    }

    state.value.testStatus = "testing";
    state.value.testError = null;

    const result = await testAiConnection(currentConfig);

    state.value.testStatus = result.success ? "success" : "error";
    state.value.testError = result.success ? null : result;

    return result;
  }

  /**
   * 清除配置
   */
  function clearConfig(): void {
    store.clearConfig();
    state.value.config = null;
    state.value.testStatus = "idle";
    state.value.testError = null;
  }

  return {
    // 状态
    config: shallowReadonly(config),
    isConfigured: shallowReadonly(isConfigured),
    isEnabled: shallowReadonly(isEnabled),
    currentProvider: shallowReadonly(currentProvider),
    currentProviderInfo: shallowReadonly(currentProviderInfo),
    testStatus: shallowReadonly(testStatus),
    testError: shallowReadonly(testError),
    providers: AI_PROVIDERS,

    // 方法
    saveConfig,
    updateConfig,
    setProvider,
    testConnection: testConnectionAsync,
    clearConfig,
  };
}

function resolveRequestConfig(config: AiUserConfig): {
  endpoint: string;
  apiKey: string;
  model: string;
  timeout: number;
  provider: AiProvider;
} | null {
  if (!isUsableAiConfig(config)) return null;

  // isUsableAiConfig 已确认 provider 合法，这里只是把类型收窄掉 undefined
  const providerInfo = getProviderInfo(config.provider);
  if (!providerInfo) return null;

  return {
    endpoint: config.endpoint || providerInfo.defaultEndpoint,
    apiKey: config.apiKey,
    model: config.model || providerInfo.defaultModel,
    timeout: config.timeout || DEFAULT_CONFIG.timeout,
    provider: config.provider,
  };
}

/**
 * 获取静态配置（非响应式，用于 API 调用）
 */
export function getAiRequestConfig(): {
  endpoint: string;
  apiKey: string;
  model: string;
  timeout: number;
  provider: AiProvider;
} | null {
  if (isHostAiManaged()) {
    const host = getHostAiConfig();
    return host ? resolveRequestConfig(host) : null;
  }

  const store = getAiConfigStore();
  const config = store.getConfig();
  if (!config) return null;

  return resolveRequestConfig(config);
}

export { isHostAiManaged };
