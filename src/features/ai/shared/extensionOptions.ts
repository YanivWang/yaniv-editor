import { createAiClient } from "@/features/ai/client";
import type { AiProvider, AiStorageMode } from "@/features/ai/config/types";

/**
 * AI 扩展动态配置 — 全部 getter，禁止在 configure 时静态取值。
 *
 * 约定：这些 getter **只反映宿主 `ai-config` prop 的原值**，不做任何兜底。
 * 缺省值（provider 默认 endpoint / model、timeout）与 localStorage / `.env`
 * 回退链统一由 `client.ts` 的 `getAiConfig()` 负责——那里是配置解析的唯一入口。
 * 若在此处填兜底值，`getAiConfig()` 会误判宿主已托管，从而永远走不到回退分支。
 */
export interface AiExtensionConfigureOptions {
  getProvider?: () => AiProvider | undefined;
  getApiKey?: () => string | undefined;
  getModel?: () => string | undefined;
  getEndpoint?: () => string | undefined;
  getTimeout?: () => number | undefined;
  /** proxy 时后端保管密钥，前端无 apiKey 也视为已配置 */
  getStorageMode?: () => AiStorageMode | undefined;
  /** 未配置 API Key 时是否走模拟流；**不要求同时有 provider**，见 resolveAiExtensionOptions */
  getDemoMode?: () => boolean | undefined;
  /** 实例 locale 文案，key 为 dot-path（如 editor.pleaseSelectText） */
  getLocaleText?: (key: string) => string;
  /** 送进 AI 上下文的文档全文字符上限；省略时用 `DEFAULT_DOCUMENT_CONTEXT_LIMIT` */
  getDocumentContextLimit?: () => number | undefined;
}

export interface ResolvedAiExtensionConfig {
  /** 缺省表示「宿主没托管 provider」——此时本对象只可能携带 demoMode，见下 */
  provider?: AiProvider;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeout?: number;
  storageMode?: AiStorageMode;
  demoMode?: boolean;
}

/**
 * 收集扩展 getter 的当前值。
 * @returns 宿主未注入 `ai-config`（无 provider）时返回 `null`，
 * 表示"本层没有配置"，由 `getAiConfig()` 继续走 localStorage / `.env` 回退。
 */
export function resolveAiExtensionOptions(
  options: AiExtensionConfigureOptions,
): ResolvedAiExtensionConfig | null {
  const provider = options.getProvider?.();
  const demoMode = options.getDemoMode?.();

  /**
   * ⚠⚠ `demoMode` 必须在**宿主没配 provider** 时也能透出去——那正是演示模式要生效的场景
   * （未配置 API Key ⟹ 才有「报错还是走模拟流」这个选择）。早先这里无条件 `return null`，
   * 于是 `ai-config="{ demoMode: true }"` 根本传不到 client，开关形同虚设。
   *
   * 返回的对象不带 `provider` 是安全的：`getAiConfig()` 判的是 `if (runtime?.provider)`，
   * 不命中就照常继续走 localStorage / 构建期回退，不会被误判成「宿主已托管」。
   */
  if (!provider) return demoMode === undefined ? null : { demoMode };

  return {
    provider,
    apiKey: options.getApiKey?.(),
    endpoint: options.getEndpoint?.(),
    model: options.getModel?.(),
    timeout: options.getTimeout?.(),
    storageMode: options.getStorageMode?.(),
    demoMode,
  };
}

export function localeText(
  options: AiExtensionConfigureOptions,
  key: string,
  fallback = key,
): string {
  return options.getLocaleText?.(key) ?? fallback;
}

/**
 * 按扩展 options getter 创建 AI client：配置每次请求现取，文案走该实例的 locale。
 * `getLocaleText` 必须一并传下去，否则 client 自己的提示（未配置 / 请求失败 / demo 流）
 * 会退回英文兜底，与编辑器其余 chrome 的语言不一致。
 */
export function createConfiguredAiClient(options: AiExtensionConfigureOptions) {
  return createAiClient({
    resolveConfig: () => resolveAiExtensionOptions(options),
    getLocaleText: options.getLocaleText,
  });
}
