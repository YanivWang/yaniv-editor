import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：节点/标记属性若占用 HTML 全局属性名，必须自带 `renderHTML`。
 *
 * Tiptap 的默认属性渲染会把属性**原样**写成同名 HTML 属性。名字一旦撞上
 * `id` / `class` / `style` 这三个全局属性，写进文档的内容就会溢出到宿主页面的语义层：
 *
 * - `id`：同一个值被用两次即产生**重复 DOM id**，还会与宿主页面已有的 id 撞车，
 *   劫持 `getElementById` / `:target` / `aria-*` 引用。
 * - `class`：覆盖掉节点视图自己写的类名，样式整体失效。
 * - `style`：让文档内容直接注入任意 CSS。
 *
 * 历史事故：`MentionExtension` 的 `id` / `label` 用默认渲染，输出
 * `<span id="page-home" label="首页">`——提及 id 来自宿主注入的 `mention-items`，
 * 同一页面被提及两次就产生重复 id（实测 `getElementById` 命中文档里的提及块）。
 *
 * 判定只要求「显式声明了 `renderHTML`」，不规定输出成什么：作者一旦写了 renderHTML，
 * 就是明确选择过输出的属性名（本仓库的约定是 `data-*`）。
 */
const RISKY_ATTRIBUTE_NAMES = new Set(["id", "class", "style"]);

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
 * 找出 `addAttributes()` 返回对象里的顶层属性项。
 *
 * 只需要「键名 + 该项自身的对象体」，按花括号深度切分即可，不必引入 TS 解析器。
 */
function findRiskyAttributes(file: string): string[] {
  return scanText(readFileSync(file, "utf8")).map((issue) => `${file}: ${issue}`);
}

function scanText(text: string): string[] {
  const findings: string[] = [];
  const blockStart = /addAttributes\(\)\s*\{/g;

  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockStart.exec(text)) !== null) {
    // 从 addAttributes 的函数体起扫，depth 1 = 函数体，depth 2 = return 的对象字面量
    let depth = 0;
    let index = blockMatch.index + blockMatch[0].length - 1;
    let entryKey: string | null = null;
    let entryDepth = 0;
    let entryBody = "";
    let buffer = "";

    for (; index < text.length; index += 1) {
      const ch = text[index];

      if (ch === "{") {
        depth += 1;
        // depth 3 = 某个属性项自身的对象体（函数体 → 返回对象 → 属性项）
        if (depth === 3 && entryKey === null) {
          const key = buffer.trim().replace(/[,;{]/g, "").trim().replace(/:$/, "").trim();
          if (RISKY_ATTRIBUTE_NAMES.has(key)) {
            entryKey = key;
            entryDepth = depth;
            entryBody = "";
          }
        }
        buffer = "";
        continue;
      }

      if (ch === "}") {
        if (entryKey !== null && depth === entryDepth) {
          if (!/\brenderHTML\b/.test(entryBody)) {
            findings.push(`属性 \`${entryKey}\` 未声明 renderHTML`);
          }
          entryKey = null;
        }
        depth -= 1;
        buffer = "";
        if (depth === 0) break;
        continue;
      }

      buffer += ch;
      if (entryKey !== null) entryBody += ch;
    }
  }

  return findings;
}

describe("节点属性不得裸用 HTML 全局属性名", () => {
  test("id / class / style 属性必须自带 renderHTML", () => {
    const files = collectSourceFiles("src");
    const findings = files.flatMap(findRiskyAttributes);

    expect(findings).toEqual([]);
  });

  test("扫描器能认出违规写法（护栏自检）", () => {
    // 与 MentionExtension 修复前同形：id 用默认渲染，label 显式声明了 renderHTML
    const sample = `
      addAttributes() {
        return {
          id: { default: null },
          label: {
            default: null,
            renderHTML: (attrs) => ({ "data-label": attrs.label }),
          },
        };
      },
    `;

    expect(scanText(sample)).toEqual(["属性 \`id\` 未声明 renderHTML"]);
  });
});
