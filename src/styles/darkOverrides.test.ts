import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：dark 覆盖块里不得出现与外层规则**同值**的声明。
 *
 * 主题走的是 CSS 变量：`--ye-border` / `--ye-footer-divider` 这些 token 本身已经在
 * `variables.css` 的 dark 段里改写过，所以
 *
 * ```scss
 * .x {
 *   border: 1px solid var(--ye-border);
 *   [data-color-mode="dark"] & { border-color: var(--ye-border); }  // ← 恒为空操作
 * }
 * ```
 *
 * 这类覆盖**永远算出与基础规则相同的值**，纯属白占产物体积，还会让人误以为
 * 这里做了什么暗色特化、改 token 时不敢动。一次清理清掉 21 条，
 * 这条护栏保证新写的样式不再长回来。
 *
 * 判定只覆盖「值字面量完全一致」这一种最保守的情形；真正需要在 dark 下换成
 * **另一个** token 或字面值的覆盖不受影响。
 *
 * 三种书写形态都要覆盖：
 * 1. **嵌套**（SCSS 的 `[data-color-mode="dark"] &`）——`findNoOpOverrides`；
 * 2. **平铺后代**（`[data-color-mode="dark"] .x { }` 与 `.x { }` 各自成条）；
 * 3. **平铺复合**（`.x[data-color-mode="dark"] { }` 与 `.x { }`，浮层元素自己带这个属性时用这种写法）。
 *
 * 形态 2 与 3 由 `findFlatNoOpOverrides` 一起处理：把选择器里所有 `[data-color-mode="dark"]`
 * 就地删掉就得到「浅色对应选择器」，两种形态自然统一。
 * 形态 2 是第 6 棒补的（当时攒出 14 条）；形态 3 是第 7 棒补的（又攒出 22 条，
 * `.drag-handle-menu` / `.block-picker-menu` / `.continuous-pages` / notion 的复选框与拖拽点等）。
 *
 * **自定义属性（`--*`）不在本护栏判定范围内。** token 层的规则相反：外观浅色段
 * （`.yaniv-editor.appearance-X`，0,2,0）本就压过全局深色段（`[data-color-mode="dark"]`，0,1,0），
 * 因此「外观深色段里与浅色同值的 token 声明」虽然对渲染无影响，却是**有意写出来的**——
 * 用来声明「深色下有意保持这个值」，并让 `darkTokenAliases.test.ts` 的形状 A 检查通过。
 * 若把它们也当死代码删掉，`--ye-code-text` 那类真缺陷（深色下行内代码对比度 1.06:1）
 * 就会重新变成沉默的。两条护栏各管一层，互不重叠。
 */
const DARK_BLOCK = /(?:#\{\$dark-selector\}|\[data-color-mode="dark"\]\s*&)\s*\{/g;

/** 取一段样式体里的顶层声明（跳过嵌套块） */
function topLevelDeclarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let depth = 0;
  let current = "";

  for (const ch of body) {
    if (ch === "{") {
      depth += 1;
      current = "";
    } else if (ch === "}") {
      depth -= 1;
      current = "";
    } else if (depth === 0) {
      if (ch === ";") {
        const colon = current.indexOf(":");
        if (colon > 0) {
          const prop = current.slice(0, colon).trim();
          if (prop && !prop.startsWith("//") && !prop.startsWith("@")) {
            out[prop] = current.slice(colon + 1).trim();
          }
        }
        current = "";
      } else {
        current += ch;
      }
    }
  }
  return out;
}

/** 从 `open` 处的 `{` 找到配对的 `}` */
function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 向前找到包住该 dark 块的那条规则的起始 `{` */
function enclosingRuleBrace(text: string, darkStart: number): number {
  let depth = 0;
  for (let i = darkStart - 1; i >= 0; i -= 1) {
    if (text[i] === "}") depth += 1;
    else if (text[i] === "{") {
      if (depth === 0) return i;
      depth -= 1;
    }
  }
  return -1;
}

/**
 * 注释掩码：把注释整段换成**等长**空白。
 *
 * 必须在按 `{` 切规则**之前**做掉：注释里只要出现一个花括号
 * （`.appearance-{name}`、`Table.configure({ resizable: true })` 这种说明文字里很常见），
 * 逐字符扫描就会把它当成规则起点，从此整份文件的规则切分全部错位——
 * 后面所有真实规则都被吞进一个畸形的「选择器」里，护栏于是**静默漏报**。
 *
 * 第 8 棒实测：给一段本该报 1 条的 CSS 前面加一句含 `{` 的注释，findings 直接变成 `[]`；
 * 仓库里 `index.css` 与 `table.css` 的文件头注释正好各含一个花括号。
 *
 * 换成等长空白（而不是删掉）是为了保住偏移量，行号才不会算偏。
 */
const maskComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

function collectStyleFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectStyleFiles(full, out);
    else if (/\.(vue|css|scss)$/.test(entry)) out.push(full);
  }
  return out;
}

function findNoOpOverrides(file: string): string[] {
  const text = maskComments(readFileSync(file, "utf8"));
  const findings: string[] = [];

  for (const match of text.matchAll(DARK_BLOCK)) {
    const open = match.index + match[0].length - 1;
    const close = matchingBrace(text, open);
    if (close < 0) continue;

    const darkDecls = topLevelDeclarations(text.slice(open + 1, close));
    if (Object.keys(darkDecls).length === 0) continue;

    const parentOpen = enclosingRuleBrace(text, match.index);
    if (parentOpen < 0) continue;
    const parentClose = matchingBrace(text, parentOpen);
    if (parentClose < 0) continue;
    const baseDecls = topLevelDeclarations(text.slice(parentOpen + 1, parentClose));

    for (const [prop, value] of Object.entries(darkDecls)) {
      // `border-left-color` 覆盖 `border-left` 简写时，比简写里拆出的各段
      const candidates = prop.endsWith("-color") ? [prop, prop.slice(0, -"-color".length)] : [prop];
      const shadowed = candidates.find(
        (name) => name in baseDecls && baseDecls[name].split(/\s+/).includes(value),
      );
      if (shadowed) {
        const line = text.slice(0, match.index).split("\n").length;
        findings.push(
          `${file}:${line} — dark 覆盖 \`${prop}: ${value}\` 与基础规则 \`${shadowed}: ${baseDecls[shadowed]}\` 同值`,
        );
      }
    }
  }
  return findings;
}

/** `.vue` 只取 `<style>` 块；`.css` / `.scss` 整份即样式 */
function styleChunks(file: string, text: string): { text: string; offset: number }[] {
  if (!file.endsWith(".vue")) return [{ text, offset: 0 }];
  const chunks: { text: string; offset: number }[] = [];
  for (const open of text.matchAll(/<style[^>]*>/gi)) {
    const start = open.index + open[0].length;
    const end = text.indexOf("</style>", start);
    chunks.push({ text: text.slice(start, end < 0 ? text.length : end), offset: start });
  }
  return chunks;
}

interface FlatRule {
  selector: string;
  body: string;
  open: number;
  /** 位于 `@media` / `@supports` 等条件块内 */
  conditional: boolean;
}

/** 把一段样式拆成 `(选择器, 规则体)`，递归进入 at-rule 并记录条件标记 */
function flatRules(source: string): FlatRule[] {
  const text = maskComments(source);
  const out: FlatRule[] = [];
  const walk = (start: number, end: number, conditional: boolean): void => {
    let buffer = "";
    let i = start;
    while (i < end) {
      if (text[i] !== "{") {
        buffer += text[i];
        i += 1;
        continue;
      }
      let depth = 0;
      let close = i;
      for (; close < end; close += 1) {
        if (text[close] === "{") depth += 1;
        else if (text[close] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const selector = buffer.trim();
      if (selector.startsWith("@")) walk(i + 1, close, true);
      else out.push({ selector, body: text.slice(i + 1, close), open: i, conditional });
      buffer = "";
      i = close + 1;
    }
  };
  walk(0, text.length, false);
  return out;
}

const DARK_ATTR = /\[data-color-mode=["']?dark["']?\]/g;
/** `:not([data-color-mode="dark"])` 是「浅色专用」，不是深色覆盖 */
const NEGATED_DARK = /:not\(\s*\[data-color-mode=/;
const squash = (s: string): string => s.replace(/\s+/g, " ").trim();

const isDarkSelector = (selector: string): boolean => {
  if (NEGATED_DARK.test(selector)) return false;
  DARK_ATTR.lastIndex = 0;
  return DARK_ATTR.test(selector);
};

/** 去掉深色属性即得浅色对应选择器；后代形态与复合形态由此统一 */
const toLightSelector = (selector: string): string => squash(selector.replace(DARK_ATTR, ""));

/** dark 值与基础值等价（含 `!important` 必须同时在场）即视为无效覆盖 */
function shadowedBy(baseValue: string, darkValue: string): boolean {
  if (baseValue === darkValue) return true;
  if (/!important/.test(baseValue) !== /!important/.test(darkValue)) return false;
  const bare = darkValue.replace(/\s*!important$/, "");
  return baseValue.split(/\s+/).includes(bare);
}

/**
 * 平铺形态：`[data-color-mode="dark"] .x` 与同文件里的 `.x` 逐条比对。
 *
 * 只比对**顶层**规则——`@media` 内的规则是条件生效的，拿来当基础值会误判。
 * dark 规则的选择器列表必须**每一条**都带 dark 前缀，混写的不判。
 */
export function findFlatNoOpOverrides(file: string, text: string): string[] {
  const findings: string[] = [];

  for (const chunk of styleChunks(file, text)) {
    const rules = flatRules(chunk.text);

    const base = new Map<string, Record<string, string>>();
    for (const rule of rules) {
      if (rule.conditional) continue;
      for (const one of rule.selector.split(",")) {
        const key = squash(one);
        if (!key || isDarkSelector(key)) continue;
        base.set(key, { ...(base.get(key) ?? {}), ...topLevelDeclarations(rule.body) });
      }
    }

    for (const rule of rules) {
      if (rule.conditional) continue;
      const selectors = rule.selector.split(",").map(squash).filter(Boolean);
      if (selectors.length === 0 || !selectors.every(isDarkSelector)) continue;

      const darkDecls = topLevelDeclarations(rule.body);
      for (const one of selectors) {
        const baseSelector = toLightSelector(one);
        const baseDecls = base.get(baseSelector);
        if (!baseDecls) continue;

        for (const [prop, value] of Object.entries(darkDecls)) {
          // token 层由 darkTokenAliases.test.ts 管，见文件头说明
          if (prop.startsWith("--")) continue;
          const candidates = prop.endsWith("-color")
            ? [prop, prop.slice(0, -"-color".length)]
            : [prop];
          const shadowed = candidates.find(
            (name) => name in baseDecls && shadowedBy(baseDecls[name], value),
          );
          if (shadowed) {
            const line = text.slice(0, chunk.offset + rule.open).split("\n").length;
            findings.push(
              `${file}:${line} — dark 覆盖 \`${prop}: ${value}\` 与基础规则 \`${baseSelector} { ${shadowed}: ${baseDecls[shadowed]} }\` 同值`,
            );
          }
        }
      }
    }
  }

  return [...new Set(findings)];
}

describe("dark 模式覆盖", () => {
  test("不存在与基础规则同值的无效覆盖（嵌套写法）", () => {
    const findings = collectStyleFiles("src").flatMap(findNoOpOverrides);
    expect(findings).toEqual([]);
  });

  test("不存在与基础规则同值的无效覆盖（平铺写法）", () => {
    const findings = collectStyleFiles("src").flatMap((file) =>
      findFlatNoOpOverrides(file, readFileSync(file, "utf8")),
    );
    expect(findings).toEqual([]);
  });

  // 扫描器自检：护栏本身必须能抓到真样本，也不能把正当覆盖算成无效
  test("平铺扫描器抓得到同值覆盖", () => {
    const css = `
      .card { color: #8c8c8c; border: 1px solid var(--ye-border); }
      [data-color-mode="dark"] .card { color: #8c8c8c; }
      [data-color-mode="dark"] .card:hover { border-color: var(--ye-border); }
    `;
    const findings = findFlatNoOpOverrides("probe.css", css);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("color: #8c8c8c");
  });

  test("平铺扫描器放过真正换了值的覆盖", () => {
    const css = `
      .card { color: #8c8c8c; background: #fff; }
      [data-color-mode="dark"] .card { color: #e0e0e0; background: #1f1f1f; }
    `;
    expect(findFlatNoOpOverrides("probe.css", css)).toEqual([]);
  });

  test("平铺扫描器抓得到复合形态的同值覆盖", () => {
    const css = `
      .menu.appearance-x { box-shadow: var(--ye-bubble-shadow); background: #fff; }
      .menu.appearance-x[data-color-mode="dark"] { box-shadow: var(--ye-bubble-shadow); background: #222; }
    `;
    const findings = findFlatNoOpOverrides("probe.css", css);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("box-shadow");
  });

  test("平铺扫描器放过 token 层的同值声明", () => {
    const css = `
      .yaniv-editor.appearance-word { --ye-primary: #0078d4; }
      .yaniv-editor.appearance-word[data-color-mode="dark"] { --ye-primary: #0078d4; }
    `;
    expect(findFlatNoOpOverrides("probe.css", css)).toEqual([]);
  });

  test("平铺扫描器不把 :not([data-color-mode=dark]) 当深色规则", () => {
    const css = `
      .x { color: red; }
      .x:not([data-color-mode="dark"]) { color: red; }
    `;
    expect(findFlatNoOpOverrides("probe.css", css)).toEqual([]);
  });

  // 注释掩码回归：注释里的花括号曾让整份文件的规则切分错位，护栏静默漏报
  test("注释里含花括号时仍抓得到同值覆盖", () => {
    const css = `
      /* 说明：根节点上是 .appearance-{name}，别写成 Table.configure({ x: 1 }) */
      .card { color: #8c8c8c; }
      [data-color-mode="dark"] .card { color: #8c8c8c; }
    `;
    expect(findFlatNoOpOverrides("probe.css", css)).toHaveLength(1);
  });

  test("注释掩码保住行号（等长空白，不是删除）", () => {
    const css = [
      "/* 一段注释",
      "   里面有 .x { color: red } 这种示例",
      "   还要再占一行 */",
      ".card { color: #8c8c8c; }",
      '[data-color-mode="dark"] .card { color: #8c8c8c; }',
    ].join("\n");
    expect(findFlatNoOpOverrides("probe.css", css)[0]).toContain("probe.css:5");
  });

  test("平铺扫描器不拿 @media 内的规则当基础值", () => {
    const css = `
      .card { background: #fff; }
      @media (width <= 480px) { .card { background: #eee; } }
      [data-color-mode="dark"] .card { background: #eee; }
    `;
    expect(findFlatNoOpOverrides("probe.css", css)).toEqual([]);
  });
});

/**
 * `data-color-mode` 由 `applyAppearanceToElement` 写在**编辑器根节点自身**上
 * （`appearance/applyAppearance.ts`，根节点即 `.yaniv-editor`）。因此深色规则
 * 只有两种正确形态：
 *
 * - `[data-color-mode="dark"] .some-descendant` —— 后代是编辑器内部元素；
 * - `.yaniv-editor[data-color-mode="dark"] …` —— 复合在根节点上。
 *
 * 而 `[data-color-mode="dark"] .yaniv-editor …` 把根节点写成了该属性的**后代**，
 * 要求另有一个外层祖先持有 `data-color-mode`——宿主页面不在我们的契约里，
 * 实际永远匹配不到。第 8 棒在 `image-toolbar.css` 抓到一条：深色 resize handle 想要
 * `#1f1f1f`，浏览器实测算出的一直是 `rgb(26, 26, 26)`（即 `--ye-bg`）。
 *
 * 这类错误 `darkOverrides` 的同值检查抓不到（它压根匹配不上浅色规则），
 * 所以单列一条。
 */
const ROOT_AS_DARK_DESCENDANT =
  /\[data-color-mode=["']?\w+["']?\]\s+(?:[^,{]*\s)?\.yaniv-editor\b/g;

export function findRootUnderDarkAncestor(file: string, text: string): string[] {
  const findings: string[] = [];
  for (const chunk of styleChunks(file, text)) {
    const rules = flatRules(chunk.text);
    for (const rule of rules) {
      for (const one of rule.selector.split(",")) {
        const selector = squash(one);
        ROOT_AS_DARK_DESCENDANT.lastIndex = 0;
        if (!ROOT_AS_DARK_DESCENDANT.test(selector)) continue;
        const line = text.slice(0, chunk.offset + rule.open).split("\n").length;
        findings.push(
          `${file}:${line} — \`${selector}\` 把 .yaniv-editor 写成 [data-color-mode] 的后代；` +
            `该属性挂在编辑器根节点自身上，应改写成 \`.yaniv-editor[data-color-mode="…"]\``,
        );
      }
    }
  }
  return [...new Set(findings)];
}

describe("深色属性的挂载层级", () => {
  test(".yaniv-editor 不被写成 [data-color-mode] 的后代", () => {
    const findings = collectStyleFiles("src").flatMap((file) =>
      findRootUnderDarkAncestor(file, readFileSync(file, "utf8")),
    );
    expect(findings).toEqual([]);
  });

  test("扫描器抓得到错误形态", () => {
    const findings = findRootUnderDarkAncestor(
      "probe.css",
      '[data-color-mode="dark"] .yaniv-editor .ProseMirror .handle { background: #1f1f1f; }',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain(".yaniv-editor");
  });

  test("扫描器抓得到中间还隔着别的选择器的写法", () => {
    expect(
      findRootUnderDarkAncestor(
        "probe.css",
        '[data-color-mode="dark"] .host .yaniv-editor { color: red; }',
      ),
    ).toHaveLength(1);
  });

  test("扫描器放行复合形态", () => {
    expect(
      findRootUnderDarkAncestor(
        "probe.css",
        '.yaniv-editor[data-color-mode="dark"] .ProseMirror .handle { background: #1f1f1f; }',
      ),
    ).toEqual([]);
  });

  test("扫描器放行「深色 + 编辑器内部后代」这一正常形态", () => {
    expect(
      findRootUnderDarkAncestor(
        "probe.css",
        '[data-color-mode="dark"] .table-menu-btn { color: red; }',
      ),
    ).toEqual([]);
  });

  test("扫描器不把 .yaniv-editor__overlay-portal 这类 BEM 派生类当成根节点", () => {
    expect(
      findRootUnderDarkAncestor(
        "probe.css",
        '[data-color-mode="dark"] .yaniv-editor__overlay-portal { color: red; }',
      ),
    ).toEqual([]);
  });
});
