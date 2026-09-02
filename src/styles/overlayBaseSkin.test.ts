import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：浮层容器必须在**结构层**样式表里就有可用的底色。
 *
 * 这些容器（拖拽块菜单、斜杠命令菜单、浮动工具栏、链接气泡、提及菜单、大纲面板）
 * 都是浮在正文之上的不透明面板。它们的结构层样式表一度把「视觉皮肤」整个推给
 * `appearance/styles/`——文件头注释就是这么写的——但没有任何东西保证每个外观都写了皮肤。
 *
 * `appearance-word` 一条 chrome 样式都没写：浏览器实测，word 外观下
 * `.drag-handle-menu` 与 `.block-picker-menu` 的 `background-color` 都是
 * `rgba(0, 0, 0, 0)`，也就是**透明面板 + 黑字直接压在正文上**；`.drag-handle__dot`
 * 没有背景色，六个拖拽点整个看不见。
 *
 * 现在结构层用 `--ye-*` token 给出所有外观都能用的基础皮肤，appearance 只在需要
 * 偏离 token 时覆盖（notion 用 Notion 的字面色）。这条护栏保证基础皮肤不再被搬走。
 *
 * 只检查「选择器恰好是这个类名本身」的规则——那才是结构层的基础规则；
 * 带 `.appearance-*` 或状态的规则是覆盖层，不算数。
 */
const OVERLAY_CONTAINERS: { selector: string; file: string }[] = [
  { selector: ".drag-handle-menu", file: "src/styles/drag-handle.css" },
  { selector: ".drag-handle-menu__submenu", file: "src/styles/drag-handle.css" },
  { selector: ".block-picker-menu", file: "src/styles/block-picker.css" },
  { selector: ".floating-menu", file: "src/styles/floating-menu-toolbar.css" },
];

/** 取出「选择器恰好等于 target」的那条规则的规则体 */
function ruleBody(css: string, target: string): string | null {
  let buffer = "";
  let i = 0;

  while (i < css.length) {
    if (css[i] !== "{") {
      buffer += css[i];
      i += 1;
      continue;
    }

    let depth = 0;
    let close = i;
    for (; close < css.length; close += 1) {
      if (css[close] === "{") depth += 1;
      else if (css[close] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    let selector = buffer.replace(/\/\*[\s\S]*?\*\//g, "");
    const semicolon = selector.lastIndexOf(";");
    if (semicolon >= 0) selector = selector.slice(semicolon + 1);
    if (selector.trim().replace(/\s+/g, " ") === target) return css.slice(i + 1, close);

    buffer = "";
    i = close + 1;
  }

  return null;
}

const declaresBackground = (body: string): boolean =>
  /(^|;)\s*background(-color)?\s*:/.test(body.replace(/\/\*[\s\S]*?\*\//g, ""));

describe("浮层容器的基础皮肤", () => {
  test.each(OVERLAY_CONTAINERS)("$selector 在 $file 里声明了背景", ({ selector, file }) => {
    const body = ruleBody(readFileSync(file, "utf8"), selector);

    expect(body, `${file} 里找不到选择器恰好是 \`${selector}\` 的基础规则`).not.toBeNull();
    expect(
      declaresBackground(body!),
      `\`${selector}\` 没有背景色：某个外观没写皮肤时，它就是透明面板压在正文上`,
    ).toBe(true);
  });

  // 扫描器自检
  test("认得出缺背景的基础规则", () => {
    const css = ".x { position: fixed; padding: 6px; }";
    expect(declaresBackground(ruleBody(css, ".x")!)).toBe(false);
  });

  test("background-color 与简写都算数，且不误认 scrollbar-color 之类", () => {
    expect(declaresBackground(ruleBody(".x { background: var(--a); }", ".x")!)).toBe(true);
    expect(declaresBackground(ruleBody(".x { background-color: red; }", ".x")!)).toBe(true);
    expect(declaresBackground(ruleBody(".x { scrollbar-color: red transparent; }", ".x")!)).toBe(
      false,
    );
  });

  test("只认选择器完全相同的规则，覆盖层不算数", () => {
    const css = ".x.appearance-y { background: red; } .x { padding: 0; }";
    expect(declaresBackground(ruleBody(css, ".x")!)).toBe(false);
  });
});
