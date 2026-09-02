import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：UA 重置声明不得写在**状态选择器**上。
 *
 * 为了键盘可达性，仓库里多处把原本的 `span` / `div` 换成了 `<button>`，随之要抹掉
 * 浏览器默认按钮外观（灰底、`outset` 边框、非继承字体）。这组重置描述的是元素的
 * **常态**，一旦被写进 `.is-selected` / `:hover` / `.is-active` 这类状态规则，
 * 元素就只在该状态下才正常，其余时间一直顶着 UA 样式。
 *
 * `MathNodeView` 的 `.math-display` 就踩过这个坑：注释写着「需重置浏览器默认按钮样式」，
 * 而整组重置被关在 `.math-node-wrapper.is-selected` 里，于是未选中的公式常态显示为
 * 一个灰色系统按钮。清理时全仓扫过一遍，其余 6 处重置都正确地落在基础选择器上，
 * 这条护栏保证以后不再写回去。
 *
 * 只认 `appearance: none` 与 `font: inherit` 这两条——它们语义上纯粹是重置，
 * 不存在「只在某状态下需要」的正当用法；`background` / `border` 这类会被状态规则
 * 合法改写，不纳入判定以免误报。
 */
const RESET_DECLARATIONS = [/appearance:\s*none/, /font:\s*inherit/];

/** 状态选择器：伪类状态、`.is-*` / `.has-*` 约定类 */
const STATE_SELECTOR =
  /:(hover|focus|active|checked|disabled|focus-visible|focus-within)\b|\.(is|has)-[\w-]+/;

function collectStyleFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectStyleFiles(full, out);
    else if (/\.(vue|css|scss)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * 逐条规则扫描。这里只需要「选择器 + 该规则体内的顶层声明」，
 * 用括号深度切分即可，不必引入完整 CSS 解析器。
 */
function findStateScopedResets(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const findings: string[] = [];
  let depth = 0;
  let buffer = "";
  const selectorStack: string[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      selectorStack[depth] = buffer.trim().split("\n").pop()?.trim() ?? "";
      depth += 1;
      buffer = "";
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
      buffer = "";
    } else {
      buffer += ch;
      if (ch === ";" && depth > 0) {
        const decl = buffer.trim();
        const selector = selectorStack.slice(0, depth).filter(Boolean).join(" ");
        if (
          RESET_DECLARATIONS.some((re) => re.test(decl)) &&
          STATE_SELECTOR.test(selector) &&
          !selector.startsWith("@")
        ) {
          const line = text.slice(0, i).split("\n").length;
          findings.push(
            `${file}:${line} — UA 重置 \`${decl}\` 被关在状态选择器 \`${selector}\` 里`,
          );
        }
        buffer = "";
      }
    }
  }
  return findings;
}

/**
 * 静态护栏：写了 `appearance: none` 的规则必须同时声明 `background`。
 *
 * `appearance: none` 只关掉原生控件绘制，**不会**清掉 UA 样式表里的
 * `button { background-color: ButtonFace }`。浏览器实测（Chromium）：
 * 只写 `appearance: none` 的 `<button>` 计算出的 `background-color` 仍是
 * `rgb(239, 239, 239)`，补一条 `background: none` 才变成 `rgba(0, 0, 0, 0)`。
 *
 * `TemplateButton` 的 `.template-card` 就漏了这条：注释写着「需重置浏览器默认按钮样式」，
 * 却只重置了 `font` / `color` / `text-align` / `appearance`，于是模板卡片一直顶着
 * UA 灰底；dark 模式下卡片标题是 `#e0e0e0`，压在 `#efefef` 上对比度约 1.15:1，
 * 基本看不见。仓库里其余 6 处重置都显式写了 background，这条护栏保证不再漏。
 *
 * 只认 `background` / `background-color`（以及 `all: unset|initial|revert` 这种整体重置）。
 */
const BACKGROUND_DECLARATION = /^(background|background-color)\s*:/;
const ALL_RESET = /^all\s*:\s*(unset|initial|revert)/;

/** 逐条规则检查：规则体里出现 `appearance: none` 时，同一规则必须声明背景 */
function findResetsWithoutBackground(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const findings: string[] = [];
  let depth = 0;
  let buffer = "";
  const selectorStack: string[] = [];
  /** 每一层规则的顶层声明，`}` 时结算 */
  const declStack: string[][] = [];
  const openLine: number[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      selectorStack[depth] = buffer.trim().split("\n").pop()?.trim() ?? "";
      openLine[depth] = text.slice(0, i).split("\n").length;
      declStack[depth] = [];
      depth += 1;
      buffer = "";
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
      const decls = declStack[depth] ?? [];
      if (
        decls.some((d) => /^appearance\s*:\s*none/.test(d)) &&
        !decls.some((d) => BACKGROUND_DECLARATION.test(d) || ALL_RESET.test(d))
      ) {
        const selector = selectorStack
          .slice(0, depth + 1)
          .filter(Boolean)
          .join(" ");
        findings.push(
          `${file}:${openLine[depth]} — \`${selector}\` 写了 appearance: none 却没重置 background，元素会留着 UA 的 ButtonFace 灰底`,
        );
      }
      declStack[depth] = [];
      buffer = "";
    } else {
      buffer += ch;
      if (ch === ";" && depth > 0) {
        declStack[depth - 1]?.push(buffer.replace(/\/\*[\s\S]*?\*\//g, "").trim());
        buffer = "";
      }
    }
  }
  return findings;
}

describe("UA 重置作用域", () => {
  test("重置声明不写在状态选择器上", () => {
    const findings = collectStyleFiles("src").flatMap(findStateScopedResets);
    expect(findings).toEqual([]);
  });

  test("appearance: none 必须配套重置 background", () => {
    const findings = collectStyleFiles("src").flatMap(findResetsWithoutBackground);
    expect(findings).toEqual([]);
  });
});
