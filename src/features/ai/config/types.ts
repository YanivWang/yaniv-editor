/**
 * AI Configuration Types
 * @description AI 用户配置系统类型定义
 */

/** 支持的 AI 提供商 */
export type AiProvider = "openai" | "deepseek" | "aliyun" | "ollama" | "custom";

/** API Key 存储方式：生产推荐使用 proxy，由后端保管密钥 */
export type AiStorageMode = "local" | "memory" | "proxy";

/**
 * AI 提供商信息 —— **只放技术参数**。
 *
 * 展示名与说明属于 UI 文案，放在语言包的 `aiSettings.providerName` / `providerDesc`
 * 里（按 `id` 索引）。此前它们写死在本常量里，导致 AI 设置弹窗在 en-US 下仍显示
 * 「阿里云通义千问」「本地运行的开源模型」。
 */
export interface AiProviderInfo {
  /** 提供商 ID；同时是语言包里 `aiSettings.providerName[id]` 的索引 */
  id: AiProvider;
  /** 默认 API 端点 */
  defaultEndpoint: string;
  /** 默认模型 */
  defaultModel: string;
  /** 是否需要 API Key */
  requiresApiKey: boolean;
  /** 文档链接 */
  docsUrl?: string;
}

/** 用户 AI 配置 */
export interface AiUserConfig {
  /** 选择的提供商 */
  provider: AiProvider;
  /** API Key；local 仅适合 demo/本地调试，生产推荐 proxy */
  apiKey: string;
  /** API Key 存储方式 */
  storageMode: AiStorageMode;
  /** API 端点（可选，用于自定义或代理） */
  endpoint?: string;
  /** 模型名称 */
  model: string;
  /** 请求超时（毫秒） */
  timeout: number;
  /** 是否启用 */
  enabled: boolean;
  /** 最后更新时间 */
  updatedAt: number;
  /**
   * 翻译目标语言，取 `LANGUAGE_CODES` 里的**语言代码**（如 `"en"` / `"zh-TW"`）。
   *
   * v0.2.0 及之前存的是界面标签（如「英语」），那会在切换编辑器语言后错乱
   * （标签随 locale 变而代码不变）。旧值会在界面首次拿到 locale 时自动迁移，
   * 反查不到就回到「未选择」。
   */
  translateTargetLang?: string;
}

/** AI 配置状态 */
export interface AiConfigState {
  /** 用户配置 */
  config: AiUserConfig | null;
  /** 是否已初始化 */
  initialized: boolean;
  /** 连接测试状态 */
  testStatus: "idle" | "testing" | "success" | "error";
  /** 上一次失败的测试结果；文案由 UI 层按 `messageKey` 翻译，见 {@link ConnectionTestResult} */
  testError: ConnectionTestResult | null;
}

/** AI 配置存储接口 */
export interface AiConfigStore {
  /** 获取配置 */
  getConfig: () => AiUserConfig | null;
  /** 保存配置 */
  saveConfig: (config: AiUserConfig) => void;
  /** 清除配置 */
  clearConfig: () => void;
  /** 获取 API Key（解密） */
  getApiKey: () => string | null;
  /** 检查是否已配置 */
  isConfigured: () => boolean;
}

/**
 * 连接测试结果。
 *
 * 只回 **key 不回文案**：`useAiConfig` 是无 locale 上下文的 composable，
 * 由持有 `useEditorT()` 的 UI 层（`AiSettingsModal`）翻译。
 * 此前这里直接回中文串，英文界面下会混出中文。
 */
export interface ConnectionTestResult {
  success: boolean;
  /** 语言包 key，形如 `aiSettings.testTimeout` */
  messageKey: string;
  /** provider 返回的原始错误文本（无法本地化）；有值时优先于 `messageKey` 展示 */
  detail?: string;
  latency?: number;
}

/** 默认配置值 */
export const DEFAULT_CONFIG: Omit<AiUserConfig, "apiKey" | "updatedAt"> = {
  provider: "openai",
  endpoint: "",
  model: "gpt-4o-mini",
  timeout: 60000,
  enabled: true,
  storageMode: "memory",
};

/** 提供商列表 */
export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: "openai",
    defaultEndpoint: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    requiresApiKey: true,
    docsUrl: "https://platform.openai.com/docs",
  },
  {
    id: "deepseek",
    defaultEndpoint: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    requiresApiKey: true,
    docsUrl: "https://platform.deepseek.com/docs",
  },
  {
    id: "aliyun",
    defaultEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    requiresApiKey: true,
    docsUrl: "https://help.aliyun.com/zh/dashscope/",
  },
  {
    id: "ollama",
    defaultEndpoint: "http://localhost:11434/api",
    defaultModel: "llama3.2",
    requiresApiKey: false,
    docsUrl: "https://ollama.com/docs",
  },
  {
    id: "custom",
    defaultEndpoint: "",
    defaultModel: "",
    requiresApiKey: true,
  },
];

/** 根据 provider ID 获取提供商信息 */
export function getProviderInfo(provider: AiProvider): AiProviderInfo | undefined {
  return AI_PROVIDERS.find((p) => p.id === provider);
}

/**
 * 判定一份用户配置是否已具备发起请求的条件 —— **唯一实现**。
 *
 * `store.isConfigured()`、`resolveRequestConfig()` 与 `useAiConfig().isConfigured`
 * 此前各写一遍同样的三条判断，改其中一条很容易漏掉另外两处。
 *
 * 注意与 `client.ts` 的 `isAiConfigured()` 区分：那个判定的是**解析后**的
 * `ResolvedAiConfig`（已经补齐 baseUrl、丢失了 storageMode 语义），入参形状不同。
 */
export function isUsableAiConfig(config: AiUserConfig | null | undefined): boolean {
  if (!config || !config.enabled) return false;

  const providerInfo = getProviderInfo(config.provider);
  if (!providerInfo) return false;

  // proxy 模式下密钥由后端保管，前端本就不该有 apiKey
  if (providerInfo.requiresApiKey && config.storageMode !== "proxy" && !config.apiKey) {
    return false;
  }

  // custom 没有默认端点，必须显式填写
  if (config.provider === "custom" && !config.endpoint) return false;

  return true;
}
