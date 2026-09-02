/**
 * 静态护栏：`LANGUAGE_CODES` 的每个 key 必须在 `editor.lang.*` 里有文案。
 *
 * 两个方向都会出问题，且都不会报错、只会静默出错：
 * - 列表里有 key 而 locale 没有 → 翻译菜单渲染出原始 key（`editor.lang.xx`）
 * - locale 里有文案而列表没注册 → 那门语言**永远不会出现在菜单里**。
 *   `ar` 就是这样漏掉的：文案早就写好了，只是没人渲染得到。
 *
 * `editor.lang.zh` 是有意不注册的例外，见 `languageCodes.ts` 文件头。
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import enUS from "@/locales/en-US";
import zhCN from "@/locales/zh-CN";

import { LANGUAGE_CODES } from "./languageCodes";

/** 有意不进翻译菜单的 `editor.lang.*` key */
const INTENTIONALLY_UNLISTED = new Set(["zh"]);

describe("翻译语言列表与文案一一对应", () => {
  it.each([
    ["zh-CN", zhCN],
    ["en-US", enUS],
  ])("%s：每个语言 key 都有文案", (_name, messages) => {
    const lang = messages.editor.lang as Record<string, string>;
    const missing = LANGUAGE_CODES.filter(({ key }) => !lang[key]).map(({ key }) => key);

    expect(missing).toEqual([]);
  });

  it("locale 里的 lang 文案不得有无人渲染的（例外须显式登记）", () => {
    const listed = new Set(LANGUAGE_CODES.map(({ key }) => key));
    const orphans = Object.keys(zhCN.editor.lang).filter(
      (key) => !listed.has(key) && !INTENTIONALLY_UNLISTED.has(key),
    );

    expect(orphans).toEqual([]);
  });

  it("阿拉伯语已注册（此前只有文案、菜单里出不来）", () => {
    expect(LANGUAGE_CODES.some(({ key }) => key === "ar")).toBe(true);
  });

  /**
   * 文档里的「N 种目标语言」是可证伪的数量断言，加语言时最容易漏改。
   * `ar` 这次就同时改了 `docs/features/ai.md` 的两处与 `prompts.ts` 的注释。
   */
  it("docs 里的语言数量与列表一致", () => {
    const doc = readFileSync("docs/features/ai.md", "utf8");
    expect(doc).toContain(`${LANGUAGE_CODES.length} 种目标语言`);
  });

  it("docs 的语言清单与列表等长", () => {
    const doc = readFileSync("docs/features/ai.md", "utf8");
    const section = doc.split("## 翻译语言")[1]?.split("##")[0] ?? "";
    const listed = section.replace(/\s/g, "").replace(/。$/, "").split("、").filter(Boolean);

    expect(listed).toHaveLength(LANGUAGE_CODES.length);
  });

  it("code 与 key 都不重复", () => {
    const codes = LANGUAGE_CODES.map((l) => l.code);
    const keys = LANGUAGE_CODES.map((l) => l.key);

    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
