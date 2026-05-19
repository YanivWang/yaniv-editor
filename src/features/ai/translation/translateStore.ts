/**
 * 翻译目标语言 — 与 AI 用户配置一并持久化
 */
import { ref, watch } from "vue";

import { getAiConfigStore } from "../config/store";

const store = getAiConfigStore();
const initial = store.getConfig()?.translateTargetLang ?? "";

export const currentTranslateLang = ref<string>(initial);

watch(currentTranslateLang, (label) => {
  const config = store.getConfig();
  if (!config) return;
  store.saveConfig({
    ...config,
    translateTargetLang: label || undefined,
    updatedAt: Date.now(),
  });
});

export function setTranslateLang(label: string): void {
  currentTranslateLang.value = label;
}

export function clearTranslateLang(): void {
  currentTranslateLang.value = "";
}
