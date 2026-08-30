/**
 * Host-managed AI config — set via YanivEditor `ai-config` prop (never persisted)
 *
 * ## 为什么是 owner 键控的注册表，而不是单个模块级变量
 *
 * 旧实现用 `let hostAiConfig` 存单份配置，同页多实例会互相覆盖：
 * - 实例 A 传 `ai-config`、实例 B 不传 → B 的请求会**静默使用 A 的密钥与端点**；
 * - A、B 各传不同配置 → 后挂载者覆盖先挂载者，A 的设置面板读到 B 的值。
 *
 * 这与 v0.1.5 修复 outline `scrollParent` 的问题同源（模块级存储 → 实例作用域）。
 *
 * 现在按 owner（每个编辑器实例一个 Symbol）分别登记。无 owner 的查询：
 * - 恰好 1 个实例登记 → 返回该配置（单实例是绝大多数场景，行为不变）；
 * - 多个实例登记 → 返回 `null` 并告警。此时不存在正确答案，**任选一个就是原来的 bug**，
 *   因此显式失败，把问题暴露在开发期而不是变成跨实例串配置。
 *
 * 扩展发起的请求不依赖这条路径：AI 扩展通过 `ctx.aiConfig()` getter 拿到所属实例的原值，
 * 由 `client.ts` 的 `getAiConfig()` 作为第一优先级消费（见该函数注释）。
 */

import type { YanivEditorAiConfig } from "@/core/editorTypes";

import { DEFAULT_CONFIG, getProviderInfo } from "./types";

import type { AiUserConfig } from "./types";

const hostAiConfigs = new Map<symbol, AiUserConfig>();

/** 无 owner 的匿名登记方（旧 API 兼容路径）共用此 key */
const ANONYMOUS_OWNER: symbol = Symbol("yaniv-ai-config-anonymous");

let warnedAmbiguous = false;

function normalizeHostConfig(input: YanivEditorAiConfig): AiUserConfig {
  const providerInfo = getProviderInfo(input.provider);
  const storageMode = input.storageMode ?? "memory";

  return {
    provider: input.provider,
    apiKey: input.apiKey ?? "",
    storageMode,
    endpoint: input.endpoint ?? providerInfo?.defaultEndpoint ?? "",
    model: input.model ?? providerInfo?.defaultModel ?? DEFAULT_CONFIG.model,
    timeout: input.timeout ?? DEFAULT_CONFIG.timeout,
    enabled: input.enabled !== false,
    updatedAt: Date.now(),
  };
}

/**
 * 解析当前应生效的宿主配置。
 * @param owner 指定实例；省略时仅在**唯一一个**实例登记了配置的情况下才返回。
 */
function resolveHostConfig(owner?: symbol): AiUserConfig | null {
  if (owner) return hostAiConfigs.get(owner) ?? null;

  if (hostAiConfigs.size === 1) {
    return hostAiConfigs.values().next().value ?? null;
  }

  if (hostAiConfigs.size > 1 && !warnedAmbiguous) {
    warnedAmbiguous = true;
    console.warn(
      "[yaniv-editor] 同页存在多个传入 ai-config 的编辑器实例，" +
        "无 owner 的宿主配置查询无法确定归属，已返回 null。" +
        "请通过 AI 扩展的 ai-config getter（实例作用域）读取配置。",
    );
  }

  return null;
}

/** 是否由集成方 props 托管（为 true 时忽略 localStorage / .env） */
export function isHostAiManaged(owner?: symbol): boolean {
  return resolveHostConfig(owner) !== null;
}

export function getHostAiConfig(owner?: symbol): AiUserConfig | null {
  return resolveHostConfig(owner);
}

export function setHostAiConfig(
  input: YanivEditorAiConfig | null | undefined,
  owner?: symbol,
): void {
  const key = owner ?? ANONYMOUS_OWNER;

  if (input) {
    hostAiConfigs.set(key, normalizeHostConfig(input));
    return;
  }

  hostAiConfigs.delete(key);
  if (hostAiConfigs.size <= 1) warnedAmbiguous = false;
}

/** 测试辅助：清空所有登记 */
export function resetHostAiConfigs(): void {
  hostAiConfigs.clear();
  warnedAmbiguous = false;
}
