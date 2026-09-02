/**
 * 翻译目标语言 — 与 AI 用户配置一并持久化
 *
 * 存的是**语言代码**（`LANGUAGE_CODES` 里的 `code`，如 `"en"`），不是界面标签。
 * 早先存的是标签（如「英语」），那会在切换编辑器语言后错乱：按钮显示成
 * 「Translate to 英语」、菜单里的选中标记也反查不到（标签随 locale 变，代码不变）。
 * 代码还能命中 `AI_PROMPTS.translate.targetLanguages` 的展示名映射，
 * 而那张表本来就是为语言代码准备的。
 */
import { ref, watch } from "vue";

import { getAiConfigStore } from "../config/store";

import { LANGUAGE_CODES } from "./languageCodes";

const store = getAiConfigStore();

function isKnownLanguageCode(value: string): boolean {
  return LANGUAGE_CODES.some((language) => language.code === value);
}

const persisted = store.getConfig()?.translateTargetLang ?? "";
const persistedIsCode = isKnownLanguageCode(persisted);

export const currentTranslateLang = ref<string>(persistedIsCode ? persisted : "");

/**
 * 旧格式（界面标签）的遗留值，等界面拿到实例 locale 后反查成代码。
 *
 * 反查不能在这里做：内置语言包是 `await import()` 按需加载的（代码分割硬约束），
 * 模块初始化时同步拿不到，而静态 import 两份语言包会把它们从按需变成必载。
 */
const legacyLabel = ref<string>(persistedIsCode ? "" : persisted);

watch(currentTranslateLang, (code) => {
  const config = store.getConfig();
  if (!config) return;
  store.saveConfig({
    ...config,
    translateTargetLang: code || undefined,
    updatedAt: Date.now(),
  });
});

export function setTranslateLang(code: string): void {
  currentTranslateLang.value = code;
}

export function clearTranslateLang(): void {
  currentTranslateLang.value = "";
}

/**
 * 把旧格式的界面标签迁移成语言代码，由界面在 locale 就绪后调用。
 *
 * `resolveLabel` 是「语言 key → 当前 locale 下的显示名」。反查不到就放弃迁移
 * （用户换过界面语言，旧标签不属于当前语言包）——此时回到「未选择」，
 * 用户重选一次即可，界面不会出现另一种语言的语言名。
 */
export function migrateLegacyTranslateLang(resolveLabel: (key: string) => string): void {
  const label = legacyLabel.value;
  if (!label) return;

  legacyLabel.value = "";
  const matched = LANGUAGE_CODES.find((language) => resolveLabel(language.key) === label);
  currentTranslateLang.value = matched?.code ?? "";
}
