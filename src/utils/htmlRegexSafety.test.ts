import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：用正则处理 HTML / 文本时的两条安全规则。
 *
 * **规则 1 —— `String.replace` 的替换串不得是运行时变量。**
 * 字符串形式的替换参数里 `$&`、`` $` ``、`$'`、`$1` 是**替换模式**，会被展开。
 * 一旦替换串来自选项或宿主输入，占位就会失效乃至把原文塞回去：
 *
 * 实测事故：`replaceImageWithPlaceholder` 把公开选项 `imagePlaceholderHtml`
 * 直接当替换串，宿主传 `<span>$&</span>` 时，
 * `<img src="secret.png">` → `<span><img src="secret.png"></span>` ——
 * 图片非但没被占位替掉，原始标签连同本地路径又被原样塞了回去。
 * 写成函数形式（`() => placeholder`）就没有任何展开语义，是彻底的修法。
 *
 * **规则 2 —— 从 HTML 摘标签不得用 `[^>]*` 当属性区。**
 * 引号内的 `>` 不结束标签。`<img alt="a>b" src="x.png">` 用 `[^>]*` 只吃到
 * `<img alt="a`，剩下 `b" src="x.png">` 作为可见文本留在文档里（实测）。
 * 一律用 `@/utils/htmlTagPattern` 的 `TAG_INNARDS` 拼属性区。
 *
 * 两条都只认**代码**：扫描前先把注释、字符串与模板串掩成等长空白，
 * 否则本文件与被扫文件里讲解这两条规则的注释自己就会把护栏点着
 * （第 8 棒的教训：扫描器不掩码，注释里一个花括号就让整份文件切分错位、静默漏报）。
 */
const SRC = join(process.cwd(), "src");

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "testing") collectSourceFiles(full, out);
    } else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 把注释、字符串字面量、模板串换成**等长**空白，正则字面量保留。
 *
 * 逐字符走一遍状态机是必须的：TS 里 `/` 既可能开注释、开正则，也可能是除号，
 * 而 `"https://x"` 里的 `//` 不是注释。等长替换保住偏移量，行号才算得准。
 */
export function maskNonCode(src: string): string {
  const out = src.split("");
  const blank = (from: number, to: number) => {
    for (let i = from; i < to && i < out.length; i++) if (out[i] !== "\n") out[i] = " ";
  };

  let i = 0;
  // 上一个有意义的字符决定 `/` 是除号还是正则开头
  let prevMeaningful = "";
  while (i < src.length) {
    const ch = src[i];

    if (ch === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === ch) break;
        j++;
      }
      // 模板串留下反引号本身，`new RegExp(\`…\`)` 的形态仍可辨认
      blank(i + 1, j);
      i = j + 1;
      prevMeaningful = ch;
      continue;
    }
    // 正则字面量：只有在「不可能是除号」的位置才当正则起头
    if (ch === "/" && !/[\w)\]]/.test(prevMeaningful)) {
      let j = i + 1;
      let inClass = false;
      while (j < src.length) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === "[") inClass = true;
        else if (src[j] === "]") inClass = false;
        else if (src[j] === "/" && !inClass) break;
        else if (src[j] === "\n") break;
        j++;
      }
      i = j + 1;
      prevMeaningful = "/";
      continue;
    }
    if (!/\s/.test(ch)) prevMeaningful = ch;
    i++;
  }
  return out.join("");
}

const lineOf = (text: string, index: number): number => text.slice(0, index).split("\n").length;

/**
 * 同文件里被定义成函数的名字。
 *
 * 替换参数是**函数**时没有任何 `$` 展开语义，是安全的，
 * 把它抽成具名函数复用（`const insert = () => placeholder`）更是正当写法 ——
 * 护栏只认「裸标识符」会把这种写法一并误报，反倒逼人去写重复的内联箭头。
 */
function localFunctionNames(masked: string): Set<string> {
  const names = new Set<string>();
  const decl =
    /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|[A-Za-z_$][\w$]*\s*=>))/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(masked)) !== null) names.add(m[1] ?? m[2]);
  return names;
}

/** 规则 1：`.replace(<任意>, <裸标识符>)` —— 替换串是变量，存在 `$` 展开语义 */
export function findVariableReplacements(source: string): string[] {
  const masked = maskNonCode(source);
  const functionNames = localFunctionNames(masked);
  const findings: string[] = [];
  const call = /\.replace(?:All)?\s*\(/g;

  let m: RegExpExecArray | null;
  while ((m = call.exec(masked)) !== null) {
    // 从左括号起按深度找出实参列表，再按顶层逗号切分
    let depth = 0;
    let k = m.index + m[0].length - 1;
    const start = k + 1;
    for (; k < masked.length; k++) {
      if (masked[k] === "(") depth++;
      else if (masked[k] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue;
    const argsText = masked.slice(start, k);
    let commaDepth = 0;
    let split = -1;
    for (let p = 0; p < argsText.length; p++) {
      const c = argsText[p];
      if (c === "(" || c === "[" || c === "{") commaDepth++;
      else if (c === ")" || c === "]" || c === "}") commaDepth--;
      else if (c === "," && commaDepth === 0) {
        split = p;
        break;
      }
    }
    if (split === -1) continue;
    const second = argsText.slice(split + 1).trim();
    if (!second) continue;
    // 允许：字面量（掩码后成空引号）、箭头函数、function、以及带参数的调用表达式
    if (/^["'`]/.test(second)) continue;
    if (second.includes("=>") || second.startsWith("function")) continue;
    // 裸标识符 / 成员访问（`opts.placeholder`），且不是函数调用
    if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(second)) {
      if (functionNames.has(second)) continue;
      findings.push(`第 ${lineOf(masked, m.index)} 行：replace 的替换串是变量 \`${second}\``);
    }
  }
  return findings;
}

/** 规则 2：正则里用 `[^>]*` 当 HTML 标签的属性区 */
export function findNaiveTagPatterns(source: string): string[] {
  const masked = maskNonCode(source);
  const findings: string[] = [];
  const naive = /\[\^>\]\*/g;
  let m: RegExpExecArray | null;
  while ((m = naive.exec(masked)) !== null) {
    findings.push(`第 ${lineOf(masked, m.index)} 行：用 \`[^>]*\` 匹配标签属性区`);
  }
  return findings;
}

describe("正则处理 HTML 的安全护栏", () => {
  const files = collectSourceFiles(SRC);

  test("扫描到了源文件", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  test("replace 的替换串不得是运行时变量（$& / $' 会被展开）", () => {
    const findings = files.flatMap((f) =>
      findVariableReplacements(readFileSync(f, "utf8")).map((x) => `${f} ${x}`),
    );
    expect(findings).toEqual([]);
  });

  test("不得用 [^>]* 匹配 HTML 标签属性区", () => {
    const findings = files.flatMap((f) =>
      findNaiveTagPatterns(readFileSync(f, "utf8")).map((x) => `${f} ${x}`),
    );
    expect(findings).toEqual([]);
  });
});

describe("护栏自检", () => {
  test("掩码：注释 / 字符串 / 模板串里的写法不算数", () => {
    expect(findNaiveTagPatterns(`// 别用 [^>]*\nconst a = 1;`)).toEqual([]);
    expect(findNaiveTagPatterns(`/* [^>]* */\nconst a = 1;`)).toEqual([]);
    expect(findNaiveTagPatterns(`const s = "[^>]*";`)).toEqual([]);
    expect(findVariableReplacements(`// x.replace(re, placeholder)\n`)).toEqual([]);
  });

  test("掩码保住行号（等长空白，不是删除）", () => {
    const src = `/* 头\n注释 */\nconst r = /<img[^>]*>/g;`;
    expect(findNaiveTagPatterns(src)[0]).toContain("第 3 行");
  });

  test("掩码不被字符串里的 // 骗到", () => {
    const src = `const u = "https://x";\nconst r = /<img[^>]*>/g;`;
    expect(findNaiveTagPatterns(src)).toHaveLength(1);
  });

  test("规则 1 命中变量替换串，放过字面量与函数", () => {
    expect(findVariableReplacements(`s.replace(RE, placeholder);`)).toHaveLength(1);
    expect(findVariableReplacements(`s.replace(RE, opts.placeholder);`)).toHaveLength(1);
    expect(findVariableReplacements(`s.replaceAll(RE, placeholder);`)).toHaveLength(1);
    expect(findVariableReplacements(`s.replace(RE, () => placeholder);`)).toEqual([]);
    expect(findVariableReplacements(`s.replace(RE, "<$1>");`)).toEqual([]);
    expect(findVariableReplacements(`s.replace(/a/g, "");`)).toEqual([]);
    expect(findVariableReplacements(`s.replace(/a/g, (m) => m);`)).toEqual([]);
  });

  test("规则 1 放过同文件定义的函数，仍抓字符串常量", () => {
    expect(findVariableReplacements(`const insert = () => ph;\ns.replace(RE, insert);`)).toEqual(
      [],
    );
    expect(
      findVariableReplacements(`function insert() { return ph; }\ns.replace(RE, insert);`),
    ).toEqual([]);
    expect(
      findVariableReplacements(`const insert = (m: string) => m;\ns.replace(RE, insert);`),
    ).toEqual([]);
    // 定义成字符串的名字仍然要报——那正是 $& 会展开的形态
    expect(findVariableReplacements(`const ph = "<span>";\ns.replace(RE, ph);`)).toHaveLength(1);
    // 别的文件定义的名字无从判断，保守报出来
    expect(findVariableReplacements(`s.replace(RE, importedThing);`)).toHaveLength(1);
  });

  test("规则 1 不被含逗号的第一个参数骗到", () => {
    // 正则里的 `{1,2}` 与函数调用里的逗号都不是实参分隔符
    expect(findVariableReplacements(`s.replace(/a{1,2}/g, () => x);`)).toEqual([]);
    expect(findVariableReplacements(`s.replace(build(a, b), fn);`)).toHaveLength(1);
  });

  test("规则 2 命中真实正则，且 TAG_INNARDS 写法不报", () => {
    expect(findNaiveTagPatterns(`const r = /<img\\b[^>]*>/gi;`)).toHaveLength(1);
    expect(findNaiveTagPatterns('const r = new RegExp(`<img\\\\b${TAG_INNARDS}>`, "gi");')).toEqual(
      [],
    );
  });
});
