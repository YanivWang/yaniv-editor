import { describe, expect, test } from "vitest";

import { AI_PROVIDERS } from "@/features/ai/config/types";

import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";

import type { TiptapLocale } from "./types";

type PlainRecord = Record<string, unknown>;

/** 收集所有叶子 key 的 dot-path */
function collectKeys(obj: PlainRecord, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return collectKeys(value as PlainRecord, path);
    }
    return [path];
  });
}

/**
 * 回归护栏：新增文案时两份语言包必须同步。
 *
 * 漏加 en-US 时 `t()` 会回退到 key 字符串本身，在英文界面上直接暴露成
 * `editor.outlineToggle` 这样的原始 key —— 这类问题类型系统抓得到，
 * 但只在 `TiptapLocale` 接口也同步更新时才抓得到，所以这里再兜一层。
 */
describe("locale parity", () => {
  const zhKeys = collectKeys(zhCN as unknown as PlainRecord).sort();
  const enKeys = collectKeys(enUS as unknown as PlainRecord).sort();

  test("zh-CN 与 en-US 的 key 集合完全一致", () => {
    expect(enKeys).toEqual(zhKeys);
  });

  test("没有空字符串文案", () => {
    for (const [name, pack] of [
      ["zh-CN", zhCN],
      ["en-US", enUS],
    ] as Array<[string, TiptapLocale]>) {
      const empty = collectKeys(pack as unknown as PlainRecord).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((cur, part) => (cur as PlainRecord)?.[part], pack);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empty, `${name} 存在空文案`).toEqual([]);
    }
  });

  /**
   * `AiProviderInfo` 只保留技术参数，展示名与说明移进语言包（按 provider id 索引）。
   * 新增 provider 时若漏加文案，AI 设置弹窗的下拉会直接显示原始 key。
   */
  test("每个 AI provider 都有展示名与说明", () => {
    for (const provider of AI_PROVIDERS) {
      expect(zhKeys, `zh-CN 缺 ${provider.id} 展示名`).toContain(
        `aiSettings.providerName.${provider.id}`,
      );
      expect(zhKeys, `zh-CN 缺 ${provider.id} 说明`).toContain(
        `aiSettings.providerDesc.${provider.id}`,
      );
      expect(enKeys, `en-US 缺 ${provider.id} 展示名`).toContain(
        `aiSettings.providerName.${provider.id}`,
      );
      expect(enKeys, `en-US 缺 ${provider.id} 说明`).toContain(
        `aiSettings.providerDesc.${provider.id}`,
      );
    }
  });

  test("AI 子包的运行时文案两包都有", () => {
    for (const key of [
      "messages.aiNotConfigured",
      "messages.aiRequestFailed",
      "aiSettings.storageMode",
      "aiSettings.storageModeHint",
      "aiSettings.testTimeout",
      "aiDemo.continue",
      "aiDemo.polish",
      "aiDemo.summarize",
      "aiDemo.translate",
      "aiDemo.custom",
    ]) {
      expect(zhKeys, `zh-CN 缺 ${key}`).toContain(key);
      expect(enKeys, `en-US 缺 ${key}`).toContain(key);
    }
  });

  test("本轮补充的 chrome / 扩展文案两包都有", () => {
    const added = [
      "editor.mediaPreview",
      "editor.imageDelete",
      "editor.videoDelete",
      "editor.dragHandleAddBlock",
      "editor.dragHandleOpenMenu",
      "editor.sessionLoading",
      "editor.sessionRetry",
      "editor.sessionInitFailed",
    ];
    for (const key of added) {
      expect(zhKeys, `zh-CN 缺 ${key}`).toContain(key);
      expect(enKeys, `en-US 缺 ${key}`).toContain(key);
    }
  });
});
