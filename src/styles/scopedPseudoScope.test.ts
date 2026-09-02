import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：`:deep()` 一类 **SFC 编译期伪类**只能写在 `<style scoped>` 里。
 *
 * `:deep()` / `:slotted()` / `::v-deep` 不是 CSS 规范里的东西，是 `@vue/compiler-sfc`
 * 在编译 **scoped** 样式时消费掉的标记。写在别处就没人转换它：
 *
 * - 普通 `.css` 文件（经 `index.css` `@import`）由 vite 原样打进 `dist/style.css`；
 * - `.vue` 里**没带 `scoped`** 的 `<style>` 同样不走 scoped 转换。
 *
 * 两种情况下 `:deep(...)` 都会原封不动出现在产物里，而浏览器把它当成未知伪类 →
 * **整条规则在解析阶段就被丢弃**，连 CSSOM 都进不去。没有任何构建期工具会报错：
 * stylelint 只管属性顺序，产物体积照涨，devtools 里也只是「这条规则不见了」。
 *
 * 第 8 棒在 `table.css` 实测到这一形态：12 条规则带 `:deep()`，浏览器里
 * `document.styleSheets` 的 829 条 style rule 中**一条都找不到**；
 * `table.table-border-outer` 想要的 `border: 2px solid #333` 实测算出 `0px none`。
 * 其中 `table-border-*` 三组全仓零引用，直接删；两条图标字号压缩改回普通后代选择器。
 *
 * `/deep/` 与 `>>>` 是 Vue 2 遗留写法，Vue 3 已移除，一并禁掉。
 * `:global()` 另有 CSS Modules（`<style module>`）这一条合法路径，因此额外放行 `module`。
 */
interface PseudoRule {
  /** 匹配这个伪类的正则 */
  pattern: RegExp;
  /** 让它合法的 `<style>` 属性（`.css` 文件一律不合法） */
  requires: string[];
}

const SFC_PSEUDOS: PseudoRule[] = [
  { pattern: /::?v-deep\b|:deep\s*\(/g, requires: ["scoped"] },
  { pattern: /::?v-slotted\b|:slotted\s*\(/g, requires: ["scoped"] },
  { pattern: /::?v-global\b|:global\s*\(/g, requires: ["scoped", "module"] },
  { pattern: /\/deep\/|>>>/g, requires: [] },
];

interface StyleChunk {
  /** `<style ...>` 的属性串；`.css` 文件为 null */
  attrs: string | null;
  text: string;
  /** 在原文件里的偏移，用来报行号 */
  offset: number;
}

/** `.vue` 拆出每个 `<style>` 块（连同它的属性）；`.css` 整份即一块 */
function styleChunks(file: string, text: string): StyleChunk[] {
  if (!file.endsWith(".vue")) return [{ attrs: null, text, offset: 0 }];
  const chunks: StyleChunk[] = [];
  for (const open of text.matchAll(/<style([^>]*)>/gi)) {
    const start = open.index + open[0].length;
    const end = text.indexOf("</style>", start);
    chunks.push({
      attrs: open[1],
      text: text.slice(start, end < 0 ? text.length : end),
      offset: start,
    });
  }
  return chunks;
}

/** 注释掩码：把 `/* … *​/` 换成等长空白，行号不受影响 */
const stripComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

export function findMisscopedPseudos(file: string, text: string): string[] {
  const findings: string[] = [];

  for (const chunk of styleChunks(file, text)) {
    const css = stripComments(chunk.text);
    for (const { pattern, requires } of SFC_PSEUDOS) {
      const allowed =
        chunk.attrs !== null &&
        requires.some((attr) => new RegExp(`\\b${attr}\\b`).test(chunk.attrs!));
      if (allowed) continue;

      for (const hit of css.matchAll(pattern)) {
        const line = text.slice(0, chunk.offset + hit.index).split("\n").length;
        const where =
          chunk.attrs === null
            ? "普通 CSS 文件"
            : `<style${chunk.attrs}>（缺 ${requires.join(" / ") || "——本就已废弃"}）`;
        findings.push(
          `${file}:${line} — ${where} 里出现 \`${hit[0].trim()}\`：` +
            `没有编译器消费它，会原样进产物，浏览器丢弃整条规则`,
        );
      }
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

describe("SFC 编译期伪类作用域", () => {
  test(":deep() 一类伪类只出现在 <style scoped> 里", () => {
    const findings: string[] = [];
    for (const file of collectStyleFiles("src")) {
      findings.push(...findMisscopedPseudos(file, readFileSync(file, "utf8")));
    }
    expect(findings).toEqual([]);
  });
});

describe("扫描器自检", () => {
  test("抓到普通 .css 里的 :deep()", () => {
    const findings = findMisscopedPseudos("a.css", ":deep(table td) { border: none; }");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("普通 CSS 文件");
  });

  test("抓到普通 .css 里作为后代出现的 :deep()", () => {
    expect(findMisscopedPseudos("a.css", ".btn :deep(.anticon) { font-size: 13px; }")).toHaveLength(
      1,
    );
  });

  test("放行 <style scoped> 里的 :deep()", () => {
    expect(
      findMisscopedPseudos("A.vue", "<style scoped>\n.btn :deep(.x) { color: red; }\n</style>"),
    ).toEqual([]);
  });

  test('放行 <style lang="scss" scoped> 这类带其它属性的写法', () => {
    expect(
      findMisscopedPseudos(
        "A.vue",
        '<style lang="scss" scoped>\n:deep(.x) { color: red; }\n</style>',
      ),
    ).toEqual([]);
  });

  test("抓到 <style> 缺 scoped 时的 :deep()", () => {
    const findings = findMisscopedPseudos("A.vue", "<style>\n:deep(.x) { color: red; }\n</style>");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("缺 scoped");
  });

  test("同一文件里 scoped 与非 scoped 两块，只报后者", () => {
    const findings = findMisscopedPseudos(
      "A.vue",
      "<style scoped>\n:deep(.a) { color: red; }\n</style>\n<style>\n:deep(.b) { color: blue; }\n</style>",
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("A.vue:5");
  });

  test("注释里的 :deep() 不算", () => {
    expect(findMisscopedPseudos("a.css", "/* 别写 :deep(.x) */\n.x { color: red; }")).toEqual([]);
  });

  test("行号按原文件计（注释掩码不吃掉换行）", () => {
    const findings = findMisscopedPseudos(
      "a.css",
      "/* 说明\n   继续 */\n\n:deep(.x) { color: red; }",
    );
    expect(findings[0]).toContain("a.css:4");
  });

  test("Vue 2 遗留的 /deep/ 与 >>> 即使 scoped 也不放行", () => {
    expect(
      findMisscopedPseudos("A.vue", "<style scoped>\n.a /deep/ .b { color: red; }\n</style>"),
    ).toHaveLength(1);
    expect(
      findMisscopedPseudos("A.vue", "<style scoped>\n.a >>> .b { color: red; }\n</style>"),
    ).toHaveLength(1);
  });

  test(":global() 在 <style module> 下放行，在普通 .css 里不放行", () => {
    expect(
      findMisscopedPseudos("A.vue", "<style module>\n:global(.x) { color: red; }\n</style>"),
    ).toEqual([]);
    expect(findMisscopedPseudos("a.css", ":global(.x) { color: red; }")).toHaveLength(1);
  });

  test("::v-deep 旧写法同样被抓", () => {
    expect(findMisscopedPseudos("a.css", ".a ::v-deep .b { color: red; }")).toHaveLength(1);
  });
});
