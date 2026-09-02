import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：`@media` 块里的声明不得被同文件后续的**无条件同选择器**规则盖掉。
 *
 * `@media` 只是条件包裹，**不提升特异性**。所以
 *
 * ```css
 * @media (width <= 768px) {
 *   .btn { height: 28px; }   // ← 窄屏想压缩
 * }
 *
 * .btn { height: 32px; }     // ← (0,1,0) 同特异性、源码更靠后 → 赢
 * ```
 *
 * 在窄屏下算出来的仍然是 `32px`——媒体查询整块静默失效，而且**没有任何工具会报错**：
 * stylelint 只管属性顺序，浏览器 devtools 也只在真正切到该断点时才看得出来。
 *
 * 第 8 棒在 `toolbar-dropdown.css` 实测到这一形态：文件开头的窄屏块想把下拉按钮压到
 * 28px / 图标 14px / 文字 12px，三条全被后面的基础规则盖掉（375px 视口下浏览器实测
 * 仍是 32px / 18px / 14px）。修法是把媒体块移到基础规则之后。
 *
 * 判定取最保守的一种：**选择器逐字相同**（归一化空白后）且声明了**同一个属性**。
 * - 后续规则若特异性更高（`.a .btn`），本就该赢，不算违规——选择器不同，天然被排除。
 * - 媒体块里的 `!important` 压得过后续的普通声明，也不算违规。
 * - 同值也算违规：媒体块里写一条与基础规则**逐字同值**的声明，同样是永远不起作用的
 *   死声明（`toolbar-dropdown.css` 的 `padding: 0 6px` 就是），留着只会让人误以为
 *   窄屏在这里做了特化。
 *
 * 正确写法是把媒体块放在它要覆盖的基础规则**之后**——同文件里
 * `.ye-dropdown-overlay` 与 `.ye-dropdown-split*` 两处一直是这么写的。
 */

/** `.vue` 只取 `<style>` 块；`.css` 整份即样式 */
function styleChunks(file: string, text: string): string[] {
  if (!file.endsWith(".vue")) return [text];
  const chunks: string[] = [];
  for (const open of text.matchAll(/<style[^>]*>/gi)) {
    const start = open.index + open[0].length;
    const end = text.indexOf("</style>", start);
    chunks.push(text.slice(start, end < 0 ? text.length : end));
  }
  return chunks;
}

interface FlatRule {
  selector: string;
  decls: Map<string, string>;
  /** 规则体在 chunk 里的起始偏移，用来报行号 */
  open: number;
  /** 位于 `@media` 条件块内 */
  inMedia: boolean;
}

const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

/** 取一段规则体里的顶层声明（跳过嵌套块） */
function topLevelDeclarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  let depth = 0;
  let current = "";

  const flush = (): void => {
    const colon = current.indexOf(":");
    if (colon > 0) {
      const prop = squash(current.slice(0, colon));
      if (prop && !prop.startsWith("//") && !prop.startsWith("@")) {
        out.set(prop, squash(current.slice(colon + 1)));
      }
    }
    current = "";
  };

  for (const ch of body) {
    if (ch === "{") {
      depth += 1;
      current = "";
    } else if (ch === "}") {
      depth -= 1;
      current = "";
    } else if (depth === 0) {
      if (ch === ";") flush();
      else current += ch;
    }
  }
  flush();
  return out;
}

/** 把一段样式按源码顺序拆成规则，递归进入 at-rule 并记录是否在 `@media` 内 */
function flatRules(text: string): FlatRule[] {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
  const out: FlatRule[] = [];

  const walk = (start: number, end: number, inMedia: boolean): void => {
    let buffer = "";
    let i = start;
    while (i < end) {
      if (stripped[i] !== "{") {
        buffer += stripped[i];
        i += 1;
        continue;
      }
      let depth = 0;
      let close = i;
      for (; close < end; close += 1) {
        if (stripped[close] === "{") depth += 1;
        else if (stripped[close] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const selector = squash(buffer);
      if (selector.startsWith("@")) {
        walk(i + 1, close, inMedia || /^@media\b/.test(selector));
      } else if (selector) {
        out.push({
          selector,
          decls: topLevelDeclarations(stripped.slice(i + 1, close)),
          open: i,
          inMedia,
        });
      }
      buffer = "";
      i = close + 1;
    }
  };

  walk(0, stripped.length, false);
  return out;
}

/** 媒体块里被后续无条件同选择器规则盖掉的声明 */
export function findShadowedMediaDeclarations(css: string): string[] {
  const rules = flatRules(css);
  const findings: string[] = [];

  for (let a = 0; a < rules.length; a += 1) {
    const media = rules[a];
    if (!media.inMedia || media.decls.size === 0) continue;

    // 只比第一条后续的无条件同选择器规则：它已经决定了最终值
    const base = rules.find((r, i) => i > a && !r.inMedia && r.selector === media.selector);
    if (!base) continue;

    for (const [prop, value] of media.decls) {
      const baseValue = base.decls.get(prop);
      if (baseValue === undefined) continue;
      // 媒体块里的 `!important` 压得过后续的普通声明
      if (/!important/.test(value) && !/!important/.test(baseValue)) continue;

      const line = css.slice(0, media.open).split("\n").length;
      const baseLine = css.slice(0, base.open).split("\n").length;
      findings.push(
        `L${line} \`@media { ${media.selector} { ${prop}: ${value} } }\` ` +
          `被 L${baseLine} 的 \`${media.selector} { ${prop}: ${baseValue} }\` 盖掉` +
          `（@media 不提升特异性，同特异性由源码顺序决胜）`,
      );
    }
  }
  return findings;
}

function collectStyleFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectStyleFiles(full, out);
    else if (/\.(vue|css)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("媒体查询顺序", () => {
  test("@media 里的声明不被同文件后续的同选择器规则盖掉", () => {
    const findings: string[] = [];
    for (const file of collectStyleFiles("src")) {
      const text = readFileSync(file, "utf8");
      for (const chunk of styleChunks(file, text)) {
        findings.push(...findShadowedMediaDeclarations(chunk).map((f) => `${file}:${f}`));
      }
    }
    expect(findings).toEqual([]);
  });
});

describe("扫描器自检", () => {
  test("抓到「媒体块在前、基础规则在后」", () => {
    const findings = findShadowedMediaDeclarations(`
      @media (width <= 768px) {
        .btn { height: 28px; }
      }
      .btn { height: 32px; }
    `);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("height: 28px");
    expect(findings[0]).toContain("height: 32px");
  });

  test("同值声明同样算死声明", () => {
    const findings = findShadowedMediaDeclarations(`
      @media (width <= 768px) {
        .btn { padding: 0 6px; }
      }
      .btn { padding: 0 6px; }
    `);
    expect(findings).toHaveLength(1);
  });

  test("放行「基础规则在前、媒体块在后」的正确写法", () => {
    expect(
      findShadowedMediaDeclarations(`
        .btn { height: 32px; }
        @media (width <= 768px) {
          .btn { height: 28px; }
        }
      `),
    ).toEqual([]);
  });

  test("放行不同选择器：后续规则特异性更高，本就该赢", () => {
    expect(
      findShadowedMediaDeclarations(`
        @media (width <= 768px) {
          .btn { height: 28px; }
        }
        .wrap .btn { height: 32px; }
      `),
    ).toEqual([]);
  });

  test("放行不同属性", () => {
    expect(
      findShadowedMediaDeclarations(`
        @media (width <= 768px) {
          .btn { height: 28px; }
        }
        .btn { width: 32px; }
      `),
    ).toEqual([]);
  });

  test("放行媒体块里的 !important（仍然压得过后续普通声明）", () => {
    expect(
      findShadowedMediaDeclarations(`
        @media (width <= 768px) {
          .btn { height: 28px !important; }
        }
        .btn { height: 32px; }
      `),
    ).toEqual([]);
  });

  test("两边都是 !important 时，后续规则仍然赢", () => {
    expect(
      findShadowedMediaDeclarations(`
        @media (width <= 768px) {
          .btn { height: 28px !important; }
        }
        .btn { height: 32px !important; }
      `),
    ).toHaveLength(1);
  });

  test("放行后续同样在媒体块内的规则（条件不同，不是同一层）", () => {
    expect(
      findShadowedMediaDeclarations(`
        @media (width <= 768px) {
          .btn { height: 28px; }
        }
        @media (width <= 480px) {
          .btn { height: 24px; }
        }
      `),
    ).toEqual([]);
  });

  test("注释里的花括号不干扰规则切分", () => {
    expect(
      findShadowedMediaDeclarations(`
        /* 这里写个 .btn { height: 99px } 迷惑扫描器 */
        .btn { height: 32px; }
        @media (width <= 768px) {
          .btn { height: 28px; }
        }
      `),
    ).toEqual([]);
  });

  test("选择器跨行书写也能归一化匹配", () => {
    const findings = findShadowedMediaDeclarations(`
      @media (width <= 768px) {
        .a,
        .b { height: 28px; }
      }
      .a,
      .b { height: 32px; }
    `);
    expect(findings).toHaveLength(1);
  });
});
