import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  YE_Z_BASE_OFFSETS,
  YE_Z_INDEX_DEFAULT_BASE,
  YE_Z_BASE_VAR,
  type YeZIndexToken,
} from "./zIndex";

/**
 * 静态护栏：`YE_Z_BASE_OFFSETS` 必须与 `variables.css` 逐条对上。
 *
 * `zIndex.ts` 的文件头写着「须与 variables.css 同步」——同步靠的是人。
 * 这张表是 `getYeZIndex()` 在**无法解析 `calc()` 的环境**下的回退值
 * （jsdom、以及任何 `getComputedStyle` 拿不到计算结果的场合），
 * 一旦与 CSS 漂移，回退出来的层级就是错的：浮层之间的相对顺序被悄悄改变，
 * 表现为「菜单被工具栏盖住」这类只在部分环境复现、又不报任何错的问题。
 *
 * 三件事一起锁：偏移量逐条相等、token 集合完全一致（不多不少）、基准默认值相等。
 */
const VARIABLES_CSS = join(process.cwd(), "src/styles/variables.css");

/** 注释掩码：等长空白，保住偏移量与行号 */
const maskComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

export interface ParsedZTokens {
  base: number | null;
  /** 基于 `--ye-z-base` 派生的 token → 偏移量 */
  offsets: Record<string, number>;
  /** 不基于 base 的独立 z token（内容层，不归 zIndex.ts 管） */
  standalone: string[];
}

/**
 * 从 CSS 文本里解析 `--ye-z-*` 声明。
 *
 * 只认三种形态：`--ye-z-base: N`、`--ye-z-x: var(--ye-z-base)`（偏移 0）、
 * `--ye-z-x: calc(var(--ye-z-base) + N)`。其余归入 standalone。
 */
export function parseZTokens(css: string): ParsedZTokens {
  const text = maskComments(css);
  const out: ParsedZTokens = { base: null, offsets: {}, standalone: [] };

  const decl = /(--ye-z-[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(text)) !== null) {
    const [, name, rawValue] = m;
    const value = rawValue.trim();

    if (name === "--ye-z-base") {
      const n = Number.parseInt(value, 10);
      if (Number.isFinite(n)) out.base = n;
      continue;
    }
    if (/^var\(\s*--ye-z-base\s*\)$/.test(value)) {
      out.offsets[name] = 0;
      continue;
    }
    const calc = value.match(/^calc\(\s*var\(\s*--ye-z-base\s*\)\s*\+\s*(-?\d+)\s*\)$/);
    if (calc) {
      out.offsets[name] = Number.parseInt(calc[1], 10);
      continue;
    }
    out.standalone.push(name);
  }
  return out;
}

describe("z-index token 表与 variables.css 同步", () => {
  const parsed = parseZTokens(readFileSync(VARIABLES_CSS, "utf8"));

  test("解析到了 token（护栏本身没空跑）", () => {
    expect(parsed.base).not.toBeNull();
    expect(Object.keys(parsed.offsets).length).toBeGreaterThan(5);
  });

  test("基准默认值一致", () => {
    expect(YE_Z_INDEX_DEFAULT_BASE).toBe(parsed.base);
  });

  test("token 集合完全一致 —— 不多也不少", () => {
    expect(Object.keys(YE_Z_BASE_OFFSETS).sort()).toEqual(Object.keys(parsed.offsets).sort());
  });

  test("每条偏移量逐条相等", () => {
    for (const [token, offset] of Object.entries(YE_Z_BASE_OFFSETS)) {
      expect(parsed.offsets[token], `${token} 的偏移量`).toBe(offset);
    }
  });

  test("基准变量名就是 CSS 里那个", () => {
    expect(YE_Z_BASE_VAR).toBe("--ye-z-base");
    expect(parsed.base).not.toBeNull();
  });

  test("独立 z token 不该混进浮层表", () => {
    // 内容层的 --ye-z-content / --ye-z-chrome 等不基于 base，归 CSS 自己管
    for (const name of parsed.standalone) {
      expect(YE_Z_BASE_OFFSETS[name as YeZIndexToken]).toBeUndefined();
    }
  });
});

describe("护栏自检", () => {
  test("认得三种派生形态，并归类独立 token", () => {
    const parsedProbe = parseZTokens(`
      .x {
        --ye-z-base: 500;
        --ye-z-a: var(--ye-z-base);
        --ye-z-b: calc(var(--ye-z-base) + 10);
        --ye-z-c: 7;
      }
    `);
    expect(parsedProbe.base).toBe(500);
    expect(parsedProbe.offsets).toEqual({ "--ye-z-a": 0, "--ye-z-b": 10 });
    expect(parsedProbe.standalone).toEqual(["--ye-z-c"]);
  });

  test("注释里的声明不算数", () => {
    const parsedProbe = parseZTokens(`
      /* --ye-z-fake: calc(var(--ye-z-base) + 999); */
      .x { --ye-z-real: calc(var(--ye-z-base) + 1); }
    `);
    expect(Object.keys(parsedProbe.offsets)).toEqual(["--ye-z-real"]);
  });

  test("偏移量漂移会被抓到", () => {
    const drifted = parseZTokens(`.x { --ye-z-tooltip: calc(var(--ye-z-base) + 61); }`);
    expect(drifted.offsets["--ye-z-tooltip"]).not.toBe(YE_Z_BASE_OFFSETS["--ye-z-tooltip"]);
  });

  test("负偏移也能解析", () => {
    expect(parseZTokens(`.x { --ye-z-under: calc(var(--ye-z-base) + -5); }`).offsets).toEqual({
      "--ye-z-under": -5,
    });
  });
});
