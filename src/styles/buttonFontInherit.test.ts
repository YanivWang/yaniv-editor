import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：**会渲染文字的 `<button>`** 必须自己接管 `font-family`。
 *
 * `<button>` 不从祖先继承 `font-family`——浏览器 UA 样式表给它的是
 * `font: 400 13.333px Arial`，比继承优先。所以只要把一个 `div` 改成 `button`
 * （通常是为了键盘可达性），文字就会**悄悄换成 Arial**，周围全是编辑器字体，
 * 只有这一处不是，而没有任何构建期工具会报错。
 *
 * 第 7 棒在大纲条目 / 大纲关闭按钮 / 块选择项抓到过三处，立了约定 17；
 * 第 8 棒又抓到两处：`.mention-suggestion-menu__item` 与 `.math-btn`。
 * 提及菜单那处的证据最直白——同一个菜单里，`__empty` 这个 `<div>` 实测
 * `"PingFang SC"`，而 `__item` 这个 `<button>` 实测 `Arial`。
 *
 * **只判「渲染文字」的按钮。** 纯图标按钮（`<button><EditOutlined /></button>`）
 * 没有文字可言，给它们加 `font: inherit` 反而会把字号从 UA 的 13.333px 换成继承值，
 * 改变图标度量——那是引入回归，不是修复。仓库里 13 个纯图标按钮因此有意不动。
 *
 * 修法沿用第 7 棒的写法：`font: inherit` 打头，后面跟显式的 `font-size`
 * （recess-order 保证简写在前，不会被简写抹掉），需要时补 `line-height: normal`
 * 以免连 `.ProseMirror` 的 1.7 行高一起继承过来、改变按钮高度。
 */

/** 收集 src 下的 .vue 与 .css（跳过测试文件） */
function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, out);
    else if (/\.(vue|css)$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
  }
  return out;
}

const maskComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

interface StyleRule {
  file: string;
  selector: string;
  body: string;
}

/** 把一份文件里的样式拆成规则（`.vue` 只取 `<style>` 块） */
export function collectRules(file: string, source: string): StyleRule[] {
  const chunks = file.endsWith(".vue")
    ? [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
    : [source];

  const out: StyleRule[] = [];
  for (const chunk of chunks) {
    const text = maskComments(chunk);
    let buffer = "";
    let i = 0;
    while (i < text.length) {
      if (text[i] !== "{") {
        buffer += text[i];
        i += 1;
        continue;
      }
      let depth = 0;
      let close = i;
      for (; close < text.length; close += 1) {
        if (text[close] === "{") depth += 1;
        else if (text[close] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const selector = buffer.replace(/\s+/g, " ").trim();
      if (selector && !selector.startsWith("@")) {
        out.push({ file, selector, body: text.slice(i + 1, close) });
      }
      buffer = "";
      i = close + 1;
    }
  }
  return out;
}

/**
 * 模板里每个渲染文字的原生 `<button>` 的**静态 class 集合**（一个按钮一组）。
 *
 * 「渲染文字」= 去掉所有标签标记后仍有非空白内容，或含 `{{ }}` 插值。
 * `<button><EditOutlined /></button>` 去掉标签后为空 → 纯图标，不算。
 *
 * 必须整组一起判，不能拆开逐个 class 判：`class="math-btn math-btn--save"` 的字体
 * 由基类 `.math-btn` 提供，单独看 `.math-btn--save` 会误报。
 */
export function textButtonClasses(template: string): string[][] {
  const out: string[][] = [];
  const clean = template.replace(/<!--[\s\S]*?-->/g, "");

  for (const open of clean.matchAll(/<button\b[^>]*>/g)) {
    const start = open.index + open[0].length;
    const end = clean.indexOf("</button>", start);
    const inner = clean.slice(start, end < 0 ? clean.length : end);
    const rendersText = /\{\{/.test(inner) || inner.replace(/<[^>]*>/g, "").trim().length > 0;
    if (!rendersText) continue;

    const classAttr = open[0].match(/(?:^|\s)class="([^"]*)"/);
    if (!classAttr) continue;
    const classes = classAttr[1].split(/\s+/).filter((c) => c && !c.includes("{"));
    if (classes.length) out.push(classes);
  }
  return out;
}

const declaresFontFamily = (body: string): boolean =>
  /(?:^|[;{\s])font\s*:/.test(body) || /(?:^|[;{\s])font-family\s*:/.test(body);

/** 一条规则的选择器是否作用到这个 class */
const targetsClass = (selector: string, cls: string): boolean =>
  new RegExp(`\\.${cls.replace(/[-]/g, "\\-")}(?![\\w-])`).test(selector);

export function findTextButtonsWithoutFont(files: { file: string; source: string }[]): string[] {
  const rules = files.flatMap(({ file, source }) => collectRules(file, source));

  const buttons: { file: string; classes: string[] }[] = [];
  for (const { file, source } of files) {
    if (!file.endsWith(".vue")) continue;
    const scriptAt = source.indexOf("<script");
    const template = source.slice(0, scriptAt < 0 ? source.length : scriptAt);
    for (const classes of textButtonClasses(template)) buttons.push({ file, classes });
  }

  const findings = new Set<string>();
  for (const { file, classes } of buttons) {
    // 该按钮身上任意一个 class 命中的规则，都可能提供字体
    const matched = rules.filter((r) => classes.some((cls) => targetsClass(r.selector, cls)));
    if (matched.length === 0) continue; // 没有任何样式 → 不是我们改造过的按钮
    if (matched.some((r) => declaresFontFamily(r.body))) continue;
    findings.add(
      `${file} 的 \`${classes.map((c) => `.${c}`).join("")}\` 是会渲染文字的 <button>，` +
        `但 ${matched.length} 条样式里没有一条声明 font / font-family——` +
        `按钮不继承字体，实际会退回 UA 的 Arial`,
    );
  }
  return [...findings];
}

describe("按钮字体继承", () => {
  test("渲染文字的原生 <button> 都接管了 font-family", () => {
    const files = collectFiles("src").map((file) => ({
      file,
      source: readFileSync(file, "utf8"),
    }));
    expect(findTextButtonsWithoutFont(files)).toEqual([]);
  });
});

describe("扫描器自检", () => {
  const vue = (template: string, style: string) => ({
    file: "A.vue",
    source: `<template>${template}</template>\n<script setup></script>\n<style>${style}</style>`,
  });

  test("抓到「有文字、样式里没有字体」的按钮", () => {
    const findings = findTextButtonsWithoutFont([
      vue(`<button class="x">确定</button>`, `.x { padding: 4px; font-size: 13px; }`),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain(".x");
  });

  test("抓到用插值渲染文字的按钮", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x">{{ t("ok") }}</button>`, `.x { padding: 4px; }`),
      ]),
    ).toHaveLength(1);
  });

  test("抓到文字包在 <span> 里的按钮", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x"><span>{{ label }}</span></button>`, `.x { padding: 4px; }`),
      ]),
    ).toHaveLength(1);
  });

  test("放行纯图标按钮（去掉标签后没有文字）", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x"><EditOutlined /></button>`, `.x { padding: 4px; }`),
      ]),
    ).toEqual([]);
  });

  test("放行声明了 font: inherit 的按钮", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x">确定</button>`, `.x { font: inherit; font-size: 13px; }`),
      ]),
    ).toEqual([]);
  });

  test("放行只声明 font-family 的按钮", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x">确定</button>`, `.x { font-family: inherit; }`),
      ]),
    ).toEqual([]);
  });

  test("字体声明可以来自另一个文件里的规则", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x">确定</button>`, `.x { padding: 4px; }`),
        { file: "b.css", source: `.wrap .x { font: inherit; }` },
      ]),
    ).toEqual([]);
  });

  test("完全没有样式的按钮不算（没被改造过）", () => {
    expect(findTextButtonsWithoutFont([vue(`<button class="x">确定</button>`, ``)])).toEqual([]);
  });

  test("不把 font-size 当成字体声明", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x">确定</button>`, `.x { font-size: 13px; }`),
      ]),
    ).toHaveLength(1);
  });

  test("注释掉的 font 不算数", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x">确定</button>`, `.x { /* font: inherit; */ padding: 4px; }`),
      ]),
    ).toHaveLength(1);
  });

  test("HTML 注释里的 <button> 不参与判定", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(
          `<!-- <button class="x">确定</button> --><div class="x">d</div>`,
          `.x { padding: 4px; }`,
        ),
      ]),
    ).toEqual([]);
  });

  test("同一按钮上的修饰类由基类提供字体时不误报", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(
          `<button class="btn btn--save">{{ t("ok") }}</button>`,
          `.btn { font: inherit; font-size: 13px; } .btn--save { color: #fff; }`,
        ),
      ]),
    ).toEqual([]);
  });

  test("整组 class 都没有字体声明时仍然要报", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(
          `<button class="btn btn--save">{{ t("ok") }}</button>`,
          `.btn { padding: 4px; } .btn--save { color: #fff; }`,
        ),
      ]),
    ).toHaveLength(1);
  });

  test("类名前缀相同的规则不误配（.x 不匹配 .x-large）", () => {
    expect(
      findTextButtonsWithoutFont([
        vue(`<button class="x">确定</button>`, `.x-large { font: inherit; } .x { padding: 4px; }`),
      ]),
    ).toHaveLength(1);
  });
});
