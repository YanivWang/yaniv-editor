import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：`addCommands()` 里的命令实现**不得**调用 `editor.commands.*` / `editor.chain()`。
 *
 * tiptap 的 `CommandManager` 在 `editor.commands` 这个 getter 里就从当前 state 造好一条
 * transaction，命令回调返回后**无条件派发**它（不看这条 tr 有没有内容）。于是
 * 「命令里再调命令」会变成：
 *
 * 1. 外层命令的 tr 在回调开始前造好，携带**那一刻的选区**；
 * 2. 内层 `editor.commands.X()` 现造一条 tr、立刻派发，改掉选区/文档；
 * 3. 回调返回，运行器派发外层那条——doc 没变所以不会报 mismatched transaction，
 *    但它带着旧选区，**把内层刚设好的选区原样盖回去**。
 *
 * 历史事故（第 17 棒，真实 Chromium 实证）：`searchReplace` 的 `focusSearchHit` 内部调
 * `editor.commands.focus()` + `editor.commands.setTextSelection()`，导致查找面板的
 * 「上一处 / 下一处 / 替换」**选区一动不动**——命中在 263–268，光标始终停在 1，
 * 而 `resultIndex` 与高亮装饰都换过去了，看起来像是「只是没滚过去」。
 * `formatPainter.ts` 里也早有一条注释写着同一件事，说明这个坑不是孤例。
 *
 * 正确写法：往命令 props 给的那条 `tr` 上写（`tr.setSelection` / `tr.insertText` /
 * `tr.setMeta`），或用 props 的 `chain` / `commands`（它们共享同一条 tr）。
 */
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
 * 把注释与字符串换成等长空白。
 *
 * 两个用途：① 括号配平不会被字符串里的 `{}` 带偏；② 匹配在掩码文本上做，
 * 免得把**讲这条规则的注释**当成违规（第一版扫描器就误报了 `formatPainter.ts`
 * 里那句注释——护栏第一次跑就报自己人，是判据有问题的信号）。
 */
function maskCommentsAndStrings(source: string): string {
  let out = "";
  let index = 0;
  let state: "code" | "line" | "block" | "string" = "code";
  let quote = "";

  while (index < source.length) {
    const char = source[index];
    const pair = source.slice(index, index + 2);

    if (state === "code") {
      if (pair === "//") {
        state = "line";
        out += "  ";
        index += 2;
      } else if (pair === "/*") {
        state = "block";
        out += "  ";
        index += 2;
      } else if (char === '"' || char === "'" || char === "`") {
        state = "string";
        quote = char;
        out += " ";
        index += 1;
      } else {
        out += char;
        index += 1;
      }
      continue;
    }

    if (state === "line") {
      if (char === "\n") state = "code";
      out += char === "\n" ? "\n" : " ";
      index += 1;
      continue;
    }

    if (state === "block") {
      if (pair === "*/") {
        state = "code";
        out += "  ";
        index += 2;
      } else {
        out += char === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    // string
    if (char === "\\") {
      out += "  ";
      index += 2;
      continue;
    }
    if (char === quote) state = "code";
    out += char === "\n" ? "\n" : " ";
    index += 1;
  }

  return out;
}

/** 从 `open` 处（一个 `{` 的下标）配平到它的右花括号，返回闭合处下标 */
function matchBrace(masked: string, open: number): number {
  let depth = 0;
  for (let index = open; index < masked.length; index += 1) {
    const char = masked[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return masked.length;
}

/** `addCommands() { ... }` 的区间 */
function commandBlockRanges(masked: string): [number, number][] {
  const ranges: [number, number][] = [];
  const opener = /addCommands\s*\(\s*\)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = opener.exec(masked))) {
    const start = match.index + match[0].length - 1;
    ranges.push([start, matchBrace(masked, start)]);
  }

  return ranges;
}

/**
 * 同文件里的具名函数体：`function NAME(...) { ... }`。
 *
 * 只认这一种形态就够用：真实事故里的 `focusSearchHit` 正是它，而**违规藏在被命令
 * 调用的辅助函数里**才是这个坑的常见长相——第一版护栏只扫 `addCommands()` 块内，
 * 拿修复前的代码做变异验证时**没有转红**，判据当场就被证伪了。
 */
function namedFunctionBodies(masked: string): Map<string, [number, number]> {
  const bodies = new Map<string, [number, number]>();
  const decl = /\bfunction\s+(\w+)\s*\([^)]*\)[^{;]*\{/g;
  let match: RegExpExecArray | null;

  while ((match = decl.exec(masked))) {
    const start = match.index + match[0].length - 1;
    bodies.set(match[1], [start, matchBrace(masked, start)]);
  }

  return bodies;
}

const NESTED_CALL = /\beditor\s*\.\s*(commands\s*\.\s*(\w+)|chain\s*\()/g;

export function scanText(source: string): string[] {
  const masked = maskCommentsAndStrings(source);
  const commandRanges = commandBlockRanges(masked);
  if (commandRanges.length === 0) return [];

  const bodies = namedFunctionBodies(masked);
  const issues: string[] = [];
  const visited = new Set<string>();
  const queue: [number, number][] = [...commandRanges];

  while (queue.length) {
    const [start, end] = queue.shift()!;
    const region = masked.slice(start, end);

    NESTED_CALL.lastIndex = 0;
    let hit: RegExpExecArray | null;
    while ((hit = NESTED_CALL.exec(region))) {
      const line = source.slice(0, start + hit.index).split("\n").length;
      const call = hit[2] ? `commands.${hit[2]}()` : "chain()";
      issues.push(`第 ${line} 行在命令链路里调了 editor.${call}`);
    }

    // 顺着调用关系再往里走一层：命令 → 同文件的辅助函数 → ……
    for (const [name, body] of bodies) {
      if (visited.has(name)) continue;
      if (!new RegExp(`\\b${name}\\s*\\(`).test(region)) continue;
      visited.add(name);
      queue.push(body);
    }
  }

  return issues.sort(
    (a, b) => Number(/第 (\d+) 行/.exec(a)![1]) - Number(/第 (\d+) 行/.exec(b)![1]),
  );
}

describe("命令实现不得在内部另起事务", () => {
  test("addCommands() 里没有 editor.commands.* / editor.chain()", () => {
    const offenders = collectSourceFiles("src").flatMap((file) =>
      scanText(readFileSync(file, "utf8")).map((issue) => `${file}: ${issue}`),
    );

    expect(offenders).toEqual([]);
  });

  test("违规藏在被命令调用的辅助函数里也要抓到（护栏自检）", () => {
    const sample = `
      function focusHit(editor, hit) {
        editor.commands.focus();
        return editor.commands.setTextSelection(hit);
      }

      addCommands() {
        return {
          selectHit:
            () =>
            ({ editor }) => focusHit(editor, { from: 1, to: 2 }),
        };
      },
    `;

    expect(scanText(sample)).toEqual([
      "第 3 行在命令链路里调了 editor.commands.focus()",
      "第 4 行在命令链路里调了 editor.commands.setTextSelection()",
    ]);
  });

  test("没有被命令调用的辅助函数不受这条规则约束", () => {
    const sample = `
      function openPanelFromToolbar(editor) {
        editor.commands.focus();
      }

      addCommands() {
        return { noop: () => ({ tr }) => !!tr };
      },
    `;

    expect(scanText(sample)).toEqual([]);
  });

  test("扫描器能认出违规写法（护栏自检）", () => {
    const sample = `
      addCommands() {
        return {
          selectHit:
            () =>
            ({ editor }) => {
              editor.commands.focus();
              return editor.commands.setTextSelection({ from: 1, to: 2 });
            },
        };
      },
    `;

    expect(scanText(sample)).toEqual([
      "第 7 行在命令链路里调了 editor.commands.focus()",
      "第 8 行在命令链路里调了 editor.commands.setTextSelection()",
    ]);
  });

  test("注释与字符串里提到这个写法不算违规（掩码自检）", () => {
    const sample = `
      addCommands() {
        return {
          noop:
            () =>
            ({ tr }) => {
              // 不要在这里调 editor.commands.focus()
              const hint = "editor.chain() 也一样";
              return !!tr && !!hint;
            },
        };
      },
    `;

    expect(scanText(sample)).toEqual([]);
  });

  test("addCommands 之外的 editor.commands 是正当用法，不该被报", () => {
    const sample = `
      function openPanel(editor) {
        editor.commands.focus();
      }
      addCommands() {
        return { noop: () => ({ tr }) => !!tr };
      },
    `;

    expect(scanText(sample)).toEqual([]);
  });
});
