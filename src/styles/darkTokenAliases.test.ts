import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：深色模式的 token 表必须是**完整**的，不能靠继承或特异性巧合补齐。
 *
 * 两种失效形状，仓库里都真实发生过，且都不会报错、只会悄悄画出浅色：
 *
 * **A. 外观浅色段盖住全局深色段。**
 * `.yaniv-editor.appearance-default`（0,2,0）比 `[data-color-mode="dark"]`（0,1,0）特异性高，
 * 于是外观浅色段声明过的 token，深色段那份永远轮不上。`appearance-default` 曾把
 * `--ye-primary` / `--ye-primary-hover` 抄了一份与 `:root` **逐字相同**的值，
 * 唯一效果就是让深色主色退回 `#3370ff`；`appearance-word` 漏了 `--ye-code-text`，
 * 深色下行内代码是 `#333` 压在 `#2d2d2d` 上，对比度约 1.06:1。
 *
 * **B. 派生 token 在声明处就被求值。**
 * 自定义属性的 `var()` 在**声明它的元素**上替换，不是在使用处。`:root` 上写
 * `--ye-table-border: var(--ye-border)`，深色再改编辑器根节点的 `--ye-border` 已经晚了。
 * 浏览器实测：补齐之前，深色下 `--ye-table-border` 解析为 `rgb(233, 234, 236)`——
 * 与浅色一模一样，`#1a1a1a` 底上是接近纯白的表格网格线。
 *
 * **C. 派生 token 只在 `:root` 上求值，跟不上实例作用域的覆盖。**
 * 形状 B 的浅色/外观版本，第 8 棒发现。改基础 token 的三条路径全都落在
 * **编辑器根节点**这一个元素上——外观类（`.yaniv-editor.appearance-word`）、
 * 深色属性（`[data-color-mode="dark"]`）、以及 `appearance="custom"` 的内联变量
 * （`applyCustomAppearanceToElement` 用 `target.style.setProperty` 直接写在该元素上）。
 * 而别名声明在 `:root`（= `<html>`，祖先元素），`var()` 在那里就替换掉了。
 * 深色路径当时没暴露，是因为深色段（本身就在编辑器根节点上）已按形状 B 重声明过一遍。
 * 浏览器实测（修复前，appearance-word 浅色）：`--ye-border` 已是 `#d4d4d4`，
 * 而 `--ye-table-border` 仍解析为 `#e9eaec`，单元格边框实测 `rgb(233, 234, 236)`；
 * word 与 notion 合计 19 个派生 token 断在这里。
 * 修法是在 `.yaniv-editor`（实例作用域，与三条覆盖路径同元素）把别名再算一次。
 *
 * 两条规则都只要求「在对应的深色段里**声明**」，不限定写成什么值：
 * 需要深色下保持浅色值（Notion 的 `--ye-blockquote-bg: transparent`、
 * Word 蓝）照样可以，只是必须写出来，把意图落到纸面上。
 */

const APPEARANCES = ["default", "word", "notion"] as const;

interface StyleRule {
  selector: string;
  body: string;
}

/** 顶层规则切分：只需要「选择器 + 规则体」，不必引入完整 CSS 解析器 */
function parseRules(source: string): StyleRule[] {
  // 必须先掩码再按 `{` 切：注释里的花括号（`.appearance-{name}`、
  // `Table.configure({ … })`）会让逐字符扫描把注释当成规则起点，
  // 从此整份文件的切分全部错位，护栏静默失准。等长空白保住偏移量。
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const rules: StyleRule[] = [];
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

    // 截掉前面的 `@import ...;` 之类语句，剩下的才是选择器（注释已在入口掩掉）
    let selector = buffer;
    const lastSemicolon = selector.lastIndexOf(";");
    if (lastSemicolon >= 0) selector = selector.slice(lastSemicolon + 1);

    rules.push({ selector: selector.trim().replace(/\s+/g, " "), body: text.slice(i + 1, close) });
    buffer = "";
    i = close + 1;
  }

  return rules;
}

/** 规则体里的顶层自定义属性声明 */
function customProperties(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let depth = 0;
  let current = "";

  for (const ch of body.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") {
      depth += 1;
      current = "";
    } else if (ch === "}") {
      depth -= 1;
      current = "";
    } else if (depth === 0) {
      if (ch === ";") {
        const colon = current.indexOf(":");
        const prop = colon > 0 ? current.slice(0, colon).trim() : "";
        if (prop.startsWith("--ye-"))
          out[prop] = current
            .slice(colon + 1)
            .replace(/\s+/g, " ")
            .trim();
        current = "";
      } else {
        current += ch;
      }
    }
  }

  return out;
}

function collectStyleFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectStyleFiles(full, out);
    else if (/\.(vue|css)$/.test(entry)) out.push(full);
  }
  return out;
}

/** 按选择器把自定义属性声明归并成「作用域 → token 表」 */
function collectScopes(rules: StyleRule[]): {
  root: Record<string, string>;
  globalDark: Record<string, string>;
  appearanceLight: Record<string, Record<string, string>>;
  appearanceDark: Record<string, Record<string, string>>;
} {
  const root: Record<string, string> = {};
  const globalDark: Record<string, string> = {};
  const appearanceLight: Record<string, Record<string, string>> = {};
  const appearanceDark: Record<string, Record<string, string>> = {};
  for (const name of APPEARANCES) {
    appearanceLight[name] = {};
    appearanceDark[name] = {};
  }

  for (const rule of rules) {
    const props = customProperties(rule.body);
    if (Object.keys(props).length === 0) continue;

    if (rule.selector === ":root" || rule.selector === ".yaniv-editor") Object.assign(root, props);
    if (rule.selector === '[data-color-mode="dark"]') Object.assign(globalDark, props);

    for (const name of APPEARANCES) {
      if (rule.selector === `.yaniv-editor.appearance-${name}`) {
        Object.assign(appearanceLight[name], props);
      }
      if (rule.selector === `.yaniv-editor.appearance-${name}[data-color-mode="dark"]`) {
        Object.assign(appearanceDark[name], props);
      }
    }
  }

  return { root, globalDark, appearanceLight, appearanceDark };
}

const referencedTokens = (value: string): string[] =>
  [...value.matchAll(/var\(\s*(--ye-[\w-]+)/g)].map((m) => m[1]);

export function findIncompleteDarkTokens(sources: string[]): string[] {
  const scopes = collectScopes(sources.flatMap(parseRules));
  const findings: string[] = [];

  // B：`:root` 上的派生 token，引用的基础 token 在深色段变了，自己却没跟着重声明
  for (const [token, value] of Object.entries(scopes.root)) {
    if (token in scopes.globalDark) continue;
    const changed = referencedTokens(value).filter((ref) => ref in scopes.globalDark);
    if (changed.length === 0) continue;
    findings.push(
      `[B] :root 的 ${token}: ${value} 引用了深色段会改写的 ${changed.join(", ")}，` +
        `但 [data-color-mode="dark"] 里没有重新声明 ${token} —— 深色下它会保留浅色求值结果`,
    );
  }

  // A：外观浅色段声明了全局深色段也想改的 token，却没在自己的深色段里给出深色值
  for (const name of APPEARANCES) {
    for (const [token, lightValue] of Object.entries(scopes.appearanceLight[name])) {
      const darkValue = scopes.globalDark[token];
      if (darkValue === undefined) continue;
      if (token in scopes.appearanceDark[name]) continue;
      if (darkValue === lightValue) continue;
      findings.push(
        `[A] appearance-${name} 浅色段声明的 ${token}: ${lightValue} 会盖住全局深色值 ${darkValue}` +
          `（0,2,0 > 0,1,0），必须在 .appearance-${name}[data-color-mode="dark"] 里显式声明`,
      );
    }

    // 外观自己的派生 token 同样要在自己的深色段里重声明
    for (const [token, value] of Object.entries(scopes.appearanceLight[name])) {
      if (token in scopes.appearanceDark[name]) continue;
      const changed = referencedTokens(value).filter(
        (ref) => ref in scopes.appearanceDark[name] || ref in scopes.globalDark,
      );
      if (changed.length === 0) continue;
      findings.push(
        `[B] appearance-${name} 的 ${token}: ${value} 引用了深色下会变的 ${changed.join(", ")}，` +
          `但 .appearance-${name}[data-color-mode="dark"] 里没有重新声明 ${token}`,
      );
    }
  }

  return findings;
}

describe("深色模式 token 表完整性", () => {
  test("全仓无遗漏", () => {
    const sources = collectStyleFiles("src").map((file) => readFileSync(file, "utf8"));
    expect(findIncompleteDarkTokens(sources)).toEqual([]);
  });

  test("抓得到派生 token 漏声明（形状 B，护栏自检）", () => {
    const css = `
      :root { --ye-border: #e9eaec; --ye-table-border: var(--ye-border); }
      [data-color-mode="dark"] { --ye-border: #373737; }
    `;
    const findings = findIncompleteDarkTokens([css]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("--ye-table-border");
  });

  test("派生 token 补上重声明后放行", () => {
    const css = `
      :root { --ye-border: #e9eaec; --ye-table-border: var(--ye-border); }
      [data-color-mode="dark"] { --ye-border: #373737; --ye-table-border: var(--ye-border); }
    `;
    expect(findIncompleteDarkTokens([css])).toEqual([]);
  });

  test("抓得到外观浅色段遮蔽深色值（形状 A，护栏自检）", () => {
    const css = `
      [data-color-mode="dark"] { --ye-code-text: #f472b6; }
      .yaniv-editor.appearance-word { --ye-code-text: #333333; }
      .yaniv-editor.appearance-word[data-color-mode="dark"] { --ye-bg: #1e1e1e; }
    `;
    const findings = findIncompleteDarkTokens([css]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("--ye-code-text");
  });

  test("外观深色段显式声明后放行，值与浅色相同也算数", () => {
    const css = `
      [data-color-mode="dark"] { --ye-blockquote-bg: #262626; }
      .yaniv-editor.appearance-notion { --ye-blockquote-bg: transparent; }
      .yaniv-editor.appearance-notion[data-color-mode="dark"] { --ye-blockquote-bg: transparent; }
    `;
    expect(findIncompleteDarkTokens([css])).toEqual([]);
  });
});

/** `:root` 上值形如 `var(--ye-X)` 的纯别名 token */
function rootPureAliases(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const rule of parseRules(css)) {
    if (rule.selector !== ":root") continue;
    for (const [prop, value] of Object.entries(customProperties(rule.body))) {
      const alias = value.match(/^var\((--ye-[\w-]+)\)$/);
      if (alias) out.set(prop, alias[1]);
    }
  }
  return out;
}

/** `.yaniv-editor` 实例作用域里声明过的自定义属性 */
function instanceScopeTokens(css: string): Set<string> {
  const out = new Set<string>();
  for (const rule of parseRules(css)) {
    if (!/^\.yaniv-editor$/.test(rule.selector)) continue;
    for (const prop of Object.keys(customProperties(rule.body))) out.add(prop);
  }
  return out;
}

export function findAliasesMissingFromInstanceScope(css: string): string[] {
  const declared = instanceScopeTokens(css);
  const findings: string[] = [];
  for (const [alias, base] of rootPureAliases(css)) {
    if (declared.has(alias)) continue;
    findings.push(
      `\`${alias}: var(${base})\` 只在 :root 上声明；` +
        `外观类 / 深色属性 / custom 内联变量都改在编辑器根节点上，` +
        `别名必须在 .yaniv-editor 作用域再声明一次才跟得上`,
    );
  }
  return findings;
}

describe("派生 token 的求值作用域", () => {
  test(":root 上的纯别名都在 .yaniv-editor 作用域重声明（形状 C）", () => {
    const css = readFileSync("src/styles/variables.css", "utf8");
    expect(findAliasesMissingFromInstanceScope(css)).toEqual([]);
  });

  test("抓得到漏掉实例作用域重声明的别名（护栏自检）", () => {
    const css = `
      :root { --ye-border: #e9eaec; --ye-table-border: var(--ye-border); }
      .yaniv-editor { --ye-z-base: 1000; }
    `;
    const findings = findAliasesMissingFromInstanceScope(css);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("--ye-table-border");
  });

  test("补上实例作用域重声明后放行", () => {
    const css = `
      :root { --ye-border: #e9eaec; --ye-table-border: var(--ye-border); }
      .yaniv-editor { --ye-table-border: var(--ye-border); }
    `;
    expect(findAliasesMissingFromInstanceScope(css)).toEqual([]);
  });

  test("不把字面值 token 当成别名", () => {
    const css = `
      :root { --ye-border: #e9eaec; --ye-radius-sm: 4px; }
      .yaniv-editor { --ye-z-base: 1000; }
    `;
    expect(findAliasesMissingFromInstanceScope(css)).toEqual([]);
  });

  test("不把 calc() 派生当成纯别名（z-index 那批自有写法）", () => {
    const css = `
      :root { --ye-z-base: 1000; --ye-z-x: calc(var(--ye-z-base) + 10); }
      .yaniv-editor { --ye-z-base: 1000; }
    `;
    expect(findAliasesMissingFromInstanceScope(css)).toEqual([]);
  });

  test("复合选择器（.yaniv-editor.appearance-x）不算实例作用域", () => {
    const css = `
      :root { --ye-border: #e9eaec; --ye-table-border: var(--ye-border); }
      .yaniv-editor.appearance-word { --ye-table-border: var(--ye-border); }
    `;
    expect(findAliasesMissingFromInstanceScope(css)).toHaveLength(1);
  });

  test("注释里含花括号时仍能正确切分（parseRules 掩码回归）", () => {
    const css = `
      /* 说明：根节点是 .appearance-{name}，别写成 configure({ a: 1 }) */
      :root { --ye-border: #e9eaec; --ye-table-border: var(--ye-border); }
      .yaniv-editor { --ye-table-border: var(--ye-border); }
    `;
    expect(findAliasesMissingFromInstanceScope(css)).toEqual([]);
  });
});
