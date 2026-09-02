import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：定义了的 `--ye-*` token 必须有人 `var()` 引用它。
 *
 * 零消费方的 token 不会报错、不会有任何视觉表现，只会一直躺在 `variables.css` 里
 * 冒充"设计系统"，还会诱导后来者去覆盖它——覆盖一个没人读的自定义属性完全没有效果。
 *
 * 一次性扫出 16 个，分三类，都不是笔误而是"写了一半"：
 * - **同名近似的重复定义**：`--ye-table-selected` / `--ye-outline-offset`
 *   （真正在用的是 `--ye-table-selected-bg` / `--ye-media-outline-offset`）
 * - **成套定义但整套没用**：`--ye-spacing-xs/sm/md/lg/xl` 全部零引用，间距一律硬编码；
 *   `--ye-shadow-sm/lg`、`--ye-radius-full`、`--ye-transition-slow` 是阶梯里没轮到的档位
 * - **配了值却没写规则**：`--ye-border-focus`（三套外观各配了色，而编辑区
 *   有意 `outline: none`）、`--ye-selection`（配了亮/暗两套，全仓却没有 `::selection` 规则）、
 *   `--ye-toolbar-btn-bg: transparent`（等于没设）、`--ye-bubble-border`（纯别名）、
 *   `--ye-doc-page-cut-height`（分页线功能从未实现，三套外观都是连续滚动）
 *
 * 判据必须双向：CSS 的 `var()` 与 JS 里以字符串形式读写的都算消费。
 *
 * 扫描范围含 `examples/`：demo 页面是**宿主用法的正式示范**，一个 token 被 demo 用到
 * 就证明它有对外价值，即使库内部没用（`--ye-radius-lg` 就是这样——`variables.css` 与
 * notion / word 各配了值，库内没用，两个 inline demo 拿它做 `border-radius`）。
 */
const TOKEN_DECL = /(?:^|[{;\s])(--ye-[\w-]+)\s*:/gm;
const TOKEN_VAR_USE = /var\(\s*(--ye-[\w-]+)/g;
/** JS/TS 里 `el.style.setProperty("--ye-x", …)` / `getPropertyValue("--ye-x")` 一类 */
const TOKEN_STRING_USE = /["'`](--ye-[\w-]+)["'`]/g;

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "node_modules") collectFiles(full, out);
    } else if (/\.(css|ts|vue)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

export function findUnconsumedTokens(files: { path: string; text: string }[]): string[] {
  const declared = new Map<string, Set<string>>();
  const consumed = new Set<string>();

  for (const { path, text } of files) {
    // 测试文件只当消费方，不当声明方：护栏自检里的假 token 不该被算成违规
    const isTest = path.endsWith(".test.ts");

    if (!isTest) {
      TOKEN_DECL.lastIndex = 0;
      let decl: RegExpExecArray | null;
      while ((decl = TOKEN_DECL.exec(text)) !== null) {
        const set = declared.get(decl[1]) ?? new Set<string>();
        set.add(path);
        declared.set(decl[1], set);
      }
    }

    for (const re of [TOKEN_VAR_USE, TOKEN_STRING_USE]) {
      re.lastIndex = 0;
      let use: RegExpExecArray | null;
      while ((use = re.exec(text)) !== null) consumed.add(use[1]);
    }
  }

  return [...declared.keys()]
    .filter((token) => !consumed.has(token))
    .map((token) => `${token}（声明于 ${[...(declared.get(token) ?? [])].join(", ")}）`)
    .sort();
}

describe("设计 token 不得零消费", () => {
  test("全仓无违规", () => {
    const files = [...collectFiles("src"), ...collectFiles("examples")].map((path) => ({
      path,
      text: readFileSync(path, "utf8"),
    }));

    expect(findUnconsumedTokens(files)).toEqual([]);
  });

  test("扫描器认得出零消费的 token（护栏自检）", () => {
    const dead = [
      {
        path: "a.css",
        text: ":root { --ye-used: red; --ye-dead: blue; }\n.x { color: var(--ye-used); }",
      },
    ];
    expect(findUnconsumedTokens(dead)).toEqual(["--ye-dead（声明于 a.css）"]);
  });

  test("JS 里以字符串读写也算消费", () => {
    const viaJs = [
      { path: "a.css", text: ":root { --ye-z-base: 1000; }" },
      { path: "b.ts", text: 'el.style.setProperty("--ye-z-base", String(n));' },
    ];
    expect(findUnconsumedTokens(viaJs)).toEqual([]);
  });

  test("被 calc(var(…)) 派生引用也算消费", () => {
    const derived = [
      {
        path: "a.css",
        text: ":root { --ye-z-base: 1000; --ye-z-x: calc(var(--ye-z-base) + 10); }\n.y { z-index: var(--ye-z-x); }",
      },
    ];
    expect(findUnconsumedTokens(derived)).toEqual([]);
  });

  test("测试文件里的假 token 不算声明", () => {
    const withTestFixture = [
      { path: "a.css", text: ":root { --ye-real: red; }\n.x { color: var(--ye-real); }" },
      { path: "a.test.ts", text: 'const css = ":root { --ye-fake: blue; }";' },
    ];
    expect(findUnconsumedTokens(withTestFixture)).toEqual([]);
  });
});
