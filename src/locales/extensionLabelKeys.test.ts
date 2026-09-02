import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { enUS } from "./en-US";
import { resolveMessage } from "./resolveMessage";
import { zhCN } from "./zh-CN";

/**
 * 静态护栏：扩展层写死的 locale key 必须在两份语言包里都解析得出。
 *
 * 扩展拿不到 Vue 的 inject，文案统一经选项回调注入
 * （`getMenuLabel` / `getLocaleText`），registry 的实现是
 * `resolveMessage(ctx.locale, key) ?? key` —— **未命中静默回退成 key 本身**，
 * 界面上直接出现 `slashCommand.heading1` 这样的原始字符串。
 *
 * 现有的两条护栏都盖不住这里：`localeParity` 只保证两份语言包彼此对齐，
 * 管不到「代码引用的 key 是否存在」；TypeScript 也管不到（回调收的是 `string`）。
 *
 * 扫描范围是**字符串字面量**。动态拼接的 key 只认得出 DragHandle 转换项那种
 * `slashKey: "x"` → `slashCommand.x` 的固定前缀写法；将来若出现别的拼法，
 * 要么在这里补规则，要么改成字面量。
 */
const SOURCE_ROOT = resolve(__dirname, "..");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "testing" ? [] : listSourceFiles(path);
    if (!/\.(ts|vue)$/.test(entry.name) || entry.name.endsWith(".test.ts")) return [];
    return [path];
  });
}

/** 先掩掉注释再匹配：注释里举例写的 key 不是真引用 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function collectLabelKeys(source: string): string[] {
  const code = stripComments(source);
  const keys = new Set<string>();

  for (const match of code.matchAll(
    /\b(?:getMenuLabel|getLocaleText)\s*(?:\?\.)?\(\s*"([^"]+)"\s*\)/g,
  )) {
    keys.add(match[1]);
  }
  for (const match of code.matchAll(/\bslashKey:\s*"([^"]+)"/g)) {
    keys.add(`slashCommand.${match[1]}`);
  }

  return [...keys];
}

/**
 * 媒体链路用 `messages.${kind}Xxx` 按种类拼 key，`kind` 的取值域是
 * `MediaKind = "image" | "video"`。上面那个扫描器只认字面量，扫不到这种拼接——
 * `videoUploadFailed` 就是这么漏的：`imageUploadFailed` 早就写好了，
 * video 那份从来没加过，界面上直接显示 `messages.videoUploadFailed`。
 */
const MEDIA_KINDS = ["image", "video"] as const;

function collectMediaKindKeys(source: string): string[] {
  const code = stripComments(source);
  const keys = new Set<string>();

  for (const match of code.matchAll(/messages\.\$\{kind\}(\w+)/g)) {
    for (const kind of MEDIA_KINDS) keys.add(`messages.${kind}${match[1]}`);
  }

  return [...keys];
}

describe("按媒体种类拼出来的 locale key", () => {
  const found = listSourceFiles(SOURCE_ROOT).flatMap((file) =>
    collectMediaKindKeys(readFileSync(file, "utf8")).map((key) => ({ file, key })),
  );

  test("扫描器确实扫到了拼接形态的 key", () => {
    const keys = new Set(found.map((entry) => entry.key));
    expect(keys).toContain("messages.imageUploadNotConfigured");
    expect(keys).toContain("messages.videoUploadNotConfigured");
    expect(keys).toContain("messages.videoUploadFailed");
  });

  test("每个种类展开后都要在两份语言包里有文案", () => {
    const missing = found.flatMap(({ file, key }) => {
      const relative = file.slice(SOURCE_ROOT.length + 1);
      return [
        ...(resolveMessage(zhCN, key) ? [] : [`zh-CN 缺 ${key}（${relative}）`]),
        ...(resolveMessage(enUS, key) ? [] : [`en-US 缺 ${key}（${relative}）`]),
      ];
    });

    expect(missing).toEqual([]);
  });

  test("自检：展开的是全部种类，注释里的写法不算", () => {
    expect(collectMediaKindKeys("translate(`messages.${kind}Foo`)")).toEqual([
      "messages.imageFoo",
      "messages.videoFoo",
    ]);
    expect(collectMediaKindKeys("// translate(`messages.${kind}Foo`)")).toEqual([]);
  });
});

describe("扩展层写死的 locale key", () => {
  const found = listSourceFiles(SOURCE_ROOT).flatMap((file) =>
    collectLabelKeys(readFileSync(file, "utf8")).map((key) => ({ file, key })),
  );

  test("扫描器确实扫到了 key（判据失效时不能静默通过）", () => {
    const keys = new Set(found.map((entry) => entry.key));
    expect(keys.size).toBeGreaterThanOrEqual(16);
    // 两种注入形态各至少一个，防止某一条正则悄悄失效
    expect(keys).toContain("editor.dragHandleOpenMenu");
    expect(keys).toContain("messages.customAiFailed");
    expect(keys).toContain("slashCommand.paragraph");
  });

  test("每个 key 在 zh-CN 与 en-US 都能解析出非空文案", () => {
    const missing = found.flatMap(({ file, key }) => {
      const relative = file.slice(SOURCE_ROOT.length + 1);
      return [
        ...(resolveMessage(zhCN, key) ? [] : [`zh-CN 缺 ${key}（${relative}）`]),
        ...(resolveMessage(enUS, key) ? [] : [`en-US 缺 ${key}（${relative}）`]),
      ];
    });

    expect(missing).toEqual([]);
  });

  test("自检：扫描器的取舍符合判据", () => {
    expect(collectLabelKeys('getMenuLabel("a.b")')).toEqual(["a.b"]);
    expect(collectLabelKeys('options.getLocaleText?.("c.d")')).toEqual(["c.d"]);
    expect(collectLabelKeys('{ slashKey: "codeBlock" }')).toEqual(["slashCommand.codeBlock"]);
    // 注释里的 key 不算引用
    expect(collectLabelKeys('// getMenuLabel("only.in.comment")')).toEqual([]);
    expect(collectLabelKeys('/* getLocaleText("only.in.block") */')).toEqual([]);
  });
});
