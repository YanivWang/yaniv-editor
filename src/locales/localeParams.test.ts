import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { zhCN } from "./zh-CN";

type PlainRecord = Record<string, unknown>;

/** 收集所有「文案里含 {占位符}」的 dot-path key */
function collectParameterizedKeys(obj: PlainRecord, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return collectParameterizedKeys(value as PlainRecord, path);
    }
    return typeof value === "string" && /\{\w+\}/.test(value) ? [path] : [];
  });
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "testing") continue;
      collectSourceFiles(full, out);
    } else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 静态护栏：带占位符的文案必须传 params。
 *
 * `t("editor.galleryCount")` 少传第二个参数不会报错，只会把 `{total}` 原样渲染到界面上——
 * 类型系统与单测都抓不到，只有肉眼看界面才发现。这里扫描全仓库源码，
 * 对现存与将来新增的文件同时生效。
 *
 * 曾经的写法是在调用点手写 `.replace("{total}", ...)`；全局 `t()` 与实例 `useEditorT()`
 * 现在共用 `interpolate`，调用点把参数传进去即可。
 */
describe("带占位符的文案必须传 params", () => {
  const parameterizedKeys = collectParameterizedKeys(zhCN as unknown as PlainRecord);
  const srcRoot = join(__dirname, "..");

  test("语言包里确实存在带占位符的文案（护栏本身没有失效）", () => {
    expect(parameterizedKeys.length).toBeGreaterThan(0);
  });

  test("没有任何调用点漏传 params", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(srcRoot)) {
      if (file.includes(join("src", "locales"))) continue;
      const source = readFileSync(file, "utf8");
      for (const key of parameterizedKeys) {
        // 只匹配「单参数调用」：t("key") 后面直接收口，没有逗号
        const singleArgCall = new RegExp(`\\bt\\(\\s*["'\`]${key}["'\`]\\s*\\)`);
        if (singleArgCall.test(source)) {
          offenders.push(`${file.slice(srcRoot.length + 1)} -> t("${key}") 未传 params`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
