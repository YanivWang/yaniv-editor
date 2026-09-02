import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

/**
 * 选中底色必须与同一作用域的品牌主色同色。
 *
 * `--ye-selection` 写的是**字面值**而不是 `color-mix(… var(--ye-primary) …)`：
 * 构建 target 是 chrome105 / safari16 / firefox110，都低于 color-mix 的支持线
 * （见 variables.css 的取值说明）。字面值的代价就是它与 `--ye-primary` 脱钩——
 * 谁改了主色而忘了跟着改选中色，页面不会报错，只会在选中文字时露出一抹旧品牌色。
 * 这条护栏把那份「本该由 var() 保证的一致性」补回来。
 *
 * 判据只看**同一个声明块内**同时出现的这两个 token，因此不需要理解选择器作用域，
 * 也不会把「只声明其一」的块误判——那种情况由 `darkTokenAliases.test.ts`
 * 的形状 A（外观浅色段声明了就必须在深色段表态）负责。
 *
 * 透明度不在判据里：亮色 30% / 深色 40% 是可以调的取值，
 * 而「跟主色同色」是不能破的不变式。
 */
const TOKEN_FILES = [
  "src/styles/variables.css",
  "src/appearance/styles/default.css",
  "src/appearance/styles/notion.css",
  "src/appearance/styles/word.css",
];

/** 先掩掉注释，再切规则块——否则注释里的示例代码会被当成声明 */
function maskComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
}

/** `#rgb` / `#rrggbb` / `rgb(r g b / a)` / `rgb(r, g, b)` → [r, g, b] */
export function parseRgb(value: string): [number, number, number] | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }
  const rgb = value.trim().match(/^rgba?\(\s*([^)]+?)\s*\)$/i);
  if (!rgb) return null;
  const parts = rgb[1]
    .replace(/\//g, " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;
  const nums = parts.slice(0, 3).map(Number);
  return nums.every((n) => Number.isFinite(n)) ? [nums[0], nums[1], nums[2]] : null;
}

export function findSelectionColorDrift(css: string, file = ""): string[] {
  const masked = maskComments(css);
  const findings: string[] = [];
  // 逐个声明块（不含嵌套；本项目的 token 块都是平铺的）
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(masked))) {
    const selector = m[1].trim().replace(/\s+/g, " ");
    const body = m[2];
    const primary = body.match(/--ye-primary:\s*([^;]+);/);
    const selection = body.match(/--ye-selection:\s*([^;]+);/);
    if (!primary || !selection) continue;
    const p = parseRgb(primary[1]);
    const s = parseRgb(selection[1]);
    if (!p || !s) {
      findings.push(
        `${file} ${selector} — 解析不出颜色（primary=${primary[1]} selection=${selection[1]}）`,
      );
      continue;
    }
    if (p[0] !== s[0] || p[1] !== s[1] || p[2] !== s[2]) {
      findings.push(
        `${file} ${selector} — --ye-selection rgb(${s.join(", ")}) 与 --ye-primary rgb(${p.join(", ")}) 不同色`,
      );
    }
  }
  return findings;
}

describe("选中底色与品牌主色同源", () => {
  test("三套外观 × 明暗两态全部同色", () => {
    const findings = TOKEN_FILES.flatMap((f) =>
      findSelectionColorDrift(readFileSync(f, "utf8"), f),
    );
    expect(findings).toEqual([]);
  });

  test("每套外观都配了选中色，且深色段单独给值", () => {
    // 少一处就会静默回落到 variables.css 的默认蓝，与该外观的品牌色不符
    const counts = Object.fromEntries(
      TOKEN_FILES.map((f) => [f, (readFileSync(f, "utf8").match(/--ye-selection:/g) ?? []).length]),
    );
    expect(counts["src/styles/variables.css"]).toBe(2); // 亮 + 暗（= default 外观基线）
    expect(counts["src/appearance/styles/notion.css"]).toBe(2);
    expect(counts["src/appearance/styles/word.css"]).toBe(2);
  });

  test("有 ::selection 规则真正消费这个 token", () => {
    const base = readFileSync("src/styles/base.css", "utf8");
    expect(base).toMatch(/::selection[^{]*\{[^}]*var\(--ye-selection\)/s);
  });

  test("扫描器认得出主色与选中色跑偏（护栏自检）", () => {
    const drifted = `.a { --ye-primary: #0078d4; --ye-selection: rgb(51 112 255 / 30%); }`;
    expect(findSelectionColorDrift(drifted)).toHaveLength(1);

    const ok = `.a { --ye-primary: #0078d4; --ye-selection: rgb(0 120 212 / 40%); }`;
    expect(findSelectionColorDrift(ok)).toEqual([]);

    // 只声明其一：不归本护栏管
    expect(findSelectionColorDrift(`.a { --ye-primary: #0078d4; }`)).toEqual([]);
  });

  test("注释里的示例不会被当成声明（护栏自检）", () => {
    const withComment = `
      /* 反例：--ye-primary: #0078d4; --ye-selection: rgb(1 2 3 / 30%); */
      .a { --ye-primary: #0078d4; --ye-selection: rgb(0 120 212 / 30%); }
    `;
    expect(findSelectionColorDrift(withComment)).toEqual([]);
  });

  test("颜色解析覆盖项目里用到的三种写法（护栏自检）", () => {
    expect(parseRgb("#3370ff")).toEqual([51, 112, 255]);
    expect(parseRgb("rgb(82, 156, 202)")).toEqual([82, 156, 202]);
    expect(parseRgb("rgb(51 112 255 / 30%)")).toEqual([51, 112, 255]);
    expect(parseRgb("#abc")).toEqual([170, 187, 204]);
    expect(parseRgb("var(--x)")).toBeNull();
  });
});
