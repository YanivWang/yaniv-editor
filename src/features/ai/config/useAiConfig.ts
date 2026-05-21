/**
 * AI Configuration Composable
 * @description Vue Composable for AI 配置管理
 */

import { ref, computed, shallowReadonly } from "vue";

import { getHostAiConfig, isHostAiManaged } from "./hostConfig";
import { getAiConfigStore } from "./store";
import { DEFAULT_CONFIG, getProviderInfo, AI_PROVIDERS } from "./types";

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
 * 测试 API 连接
 */
async function testAiConnection(config: AiUserConfig): Promise<ConnectionTestResult> {
  const providerInfo = getProviderInfo(config.provider);
  if (!providerInfo) {
    return { success: false, message: "未知的提供商" };
  }

  // 检查必要参数
  if (providerInfo.requiresApiKey && config.storageMode !== "proxy" && !config.apiKey) {
    return { success: false, message: "请输入 API Key" };
  }

  const endpoint = config.endpoint || providerInfo.defaultEndpoint;
  if (!endpoint) {
    return { success: false, message: "请输入 API 端点" };
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
      return { success: true, message: "连接成功", latency };
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
      const errorMessage =
        errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      return { success: false, message: errorMessage, latency };
    }

    return { success: true, message: "连接成功", latency };
  } catch (error) {
    const latency = Date.now() - startTime;
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return { success: false, message: "连接超时", latency };
      }
      return { success: false, message: error.message, latency };
    }
    return { success: false, message: "连接失败", latency };
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
  const isConfigured = computed(() => store.isConfigured());
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
      return { success: false, message: "请先配置 AI 设置" };
    }

    state.value.testStatus = "testing";
    state.value.testError = null;

    const result = await testAiConnection(currentConfig);

    state.value.testStatus = result.success ? "success" : "error";
    state.value.testError = result.success ? null : result.message;

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
  if (!config.enabled) return null;

  const providerInfo = getProviderInfo(config.provider);
  if (!providerInfo) return null;

  if (providerInfo.requiresApiKey && config.storageMode !== "proxy" && !config.apiKey) {
    return null;
  }

  if (config.provider === "custom" && !config.endpoint) {
    return null;
  }

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
