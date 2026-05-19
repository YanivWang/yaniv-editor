import { createI18n, type LocaleCode, type LocaleMessages } from "../../src/locales";

import { demoEnUS } from "./en-US";
import { demoZhCN } from "./zh-CN";
import { demoZhTW } from "./zh-TW";

export type { DemoMessages } from "./types";

export const demoMessages = {
  "zh-CN": demoZhCN,
  "en-US": demoEnUS,
  "zh-TW": demoZhTW,
} as const;

export function initDemoI18n(locale: LocaleCode = "zh-CN") {
  createI18n({
    locale,
    messages: demoMessages as unknown as Record<string, LocaleMessages>,
  });
}
