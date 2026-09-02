import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：JS 不得用内联 style 写 `--ye-*` 设计 token。
 *
 * 这些 token 归 CSS 分层所有——`variables.css` 给基础值，
 * `appearance/styles/*.css` 三套外观各自覆盖。而元素上的内联 style
 * 优先级高于**任何**选择器，JS 写一次就等于把整套外观按死。
 *
 * 历史事故：`useEditorPagination.initPageCssVariables()` 把 A4 常量写到
 * `.document-container` 上，浏览器实测 default 外观的 900px 页宽被压成 794px、
 * 48px 内边距被压成 96px，notion 的 708px 同样被压成 794px——
 * 三套外观的文档尺寸设置全部失效，而且不报任何错。
 *
 * 只允许两条正当路径（见 ALLOWED）：custom 外观的变量注入，
 * 以及 `--ye-z-base`（设计上就由 `zIndexBase` prop 交给宿主覆盖）。
 */
const SRC = join(process.cwd(), "src");

/** 允许写 token 的位置：文件 → 允许的 token 前缀（`*` 表示该文件本就是注入通道） */
const ALLOWED: Record<string, "*" | string[]> = {
  // custom 外观的唯一注入点，写什么由宿主的 customAppearanceVars 决定
  "appearance/applyAppearance.ts": "*",
  // 浮层 z-index 基准：公开 prop `zIndexBase` 的实现
  "core/shell/EditorShell.vue": ["--ye-z-base"],
};

/** 注释掩码：等长空白，保住行号 */
const maskComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "testing") collectSourceFiles(full, out);
    } else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const lineOf = (text: string, index: number): number => text.slice(0, index).split("\n").length;

/** 找出「用字面量 token 名调用 setProperty」的位置 */
export function findTokenWrites(source: string): { token: string; line: number }[] {
  const masked = maskComments(source);
  const found: { token: string; line: number }[] = [];
  const call = /\.setProperty\(\s*["'`](--[\w-]+)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = call.exec(masked)) !== null) {
    found.push({ token: m[1], line: lineOf(masked, m.index) });
  }
  return found;
}

describe("设计 token 的写入范围", () => {
  const files = collectSourceFiles(SRC);

  test("护栏没空跑", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  test("JS 不得内联写 --ye-* 设计 token（custom 注入与 z-base 除外）", () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = relative(SRC, file);
      const allowed = ALLOWED[rel];
      if (allowed === "*") continue;
      for (const { token, line } of findTokenWrites(readFileSync(file, "utf8"))) {
        if (!token.startsWith("--ye-")) continue;
        if (Array.isArray(allowed) && allowed.includes(token)) continue;
        violations.push(`${rel}:${line} 写入了设计 token ${token}`);
      }
    }
    expect(violations).toEqual([]);
  });

  test("白名单本身没有过期条目", () => {
    for (const rel of Object.keys(ALLOWED)) {
      expect(() => statSync(join(SRC, rel)), `白名单里的 ${rel} 不存在了`).not.toThrow();
    }
  });
});

describe("护栏自检", () => {
  test("抓得到字面量写入", () => {
    expect(findTokenWrites(`el.style.setProperty("--ye-doc-page-width", "794px");`)).toEqual([
      { token: "--ye-doc-page-width", line: 1 },
    ]);
    expect(findTokenWrites("el.style.setProperty('--ye-x', v);")).toHaveLength(1);
    expect(findTokenWrites("el.style.setProperty(`--ye-y`, v);")).toHaveLength(1);
  });

  test("注释里的写法不算数", () => {
    expect(findTokenWrites(`// el.style.setProperty("--ye-x", v)`)).toEqual([]);
    expect(findTokenWrites(`/* setProperty("--ye-x", v) */`)).toEqual([]);
  });

  test("非 token 的 setProperty 不误报", () => {
    expect(findTokenWrites(`el.style.setProperty("color", "red");`)).toEqual([]);
    // 变量名形式无法静态判断，交给白名单文件的人工审查
    expect(findTokenWrites(`el.style.setProperty(prop, value);`)).toEqual([]);
  });

  test("行号按原文件计", () => {
    const src = `/* 头\n注释 */\nel.style.setProperty("--ye-z", 1);`;
    expect(findTokenWrites(src)[0].line).toBe(3);
  });

  test("URL 里的 // 不被当成行注释", () => {
    const src = `const u = "https://x";\nel.style.setProperty("--ye-a", 1);`;
    expect(findTokenWrites(src)).toHaveLength(1);
  });
});
