import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 间距值的**棘轮**：锁住当前用到的这一组值，新值必须显式加进来。
 *
 * 这条护栏刻意**不是** token 化。第 13 棒调研过：真正需要随外观变化的间距
 * （文档页宽、页边距、正文上下留白）早就是 token 了——`--ye-doc-page-padding`、
 * `--ye-doc-padding-top` 等，三套外观各配各的值。剩下的硬编码全是组件内部的实现细节
 * （工具栏按钮的 padding、下拉菜单的 gap），既不随外观变，宿主也没有覆盖它们的需求。
 * 给这些再包一层 `var()` 只会多一层间接、多吃产物预算，换不来任何可覆盖性——
 * 那正是不变量 42 要防的「零消费方的 token 冒充设计系统」。
 *
 * 间距这块真实的风险不是「没有 token」，而是**熵增**：一次随手写的 `5px`、`11px`
 * 会长期留下，久而久之同类元素的间距各不相同，而没有任何机制提醒。
 * 所以这里锁的是**值的集合**：写出集合外的新值，测试会红，作者必须回到这个清单、
 * 想一下究竟是该复用既有档位，还是这个场景真的需要一个新值——需要就加进来并写清理由。
 *
 * ⚠️ 加值之前先问：**能不能用已有的档位？** 这个清单变长本身就是信号。
 */

/** 常用阶梯：实测用量 ≥18 处的档位（8px×96 / 12px×66 / 4px×61 / 6px×34 / 10px×33 …） */
const LADDER = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 24];

/**
 * 阶梯外的值，每条都要有理由。第 13 棒逐处核对过，全部保留：
 * 改动它们需要设计依据，而「看着不齐」不是依据。
 */
const ALLOWED_EXCEPTIONS: Record<number, string> = {
  [-18]: "notion 外观标题的负向外边距，与其排版节奏成对",
  [-1]: "边框补偿：让相邻元素的 1px 边框重叠，不产生 2px 粗边",
  3: "notion 的紧凑行距 / 表格单元格与拖拽手柄的细微留白",
  5: "工具栏下拉与大纲条目的垂直微调，配合各自的行高做视觉居中",
  7: "拖拽手柄的垂直内边距，配合 8px 水平内边距做成略扁的点击区",
  11: "ColorPicker 里对齐 antd 组件自身尺寸的补偿值",
  18: "default 外观 h4 与 word 外观标题的排版节奏（36/28/22/18 递减序列）",
  20: "AI 设置弹窗的分组间距",
  22: "default 外观 h3 的排版节奏",
  28: "default 外观 h2 的排版节奏",
  32: "notion 外观正文顶部留白",
  36: "default 外观 h1 的排版节奏",
  40: "代码块顶部留白，给语言标签与复制按钮让位（功能性尺寸）",
  48: "图库空状态的大留白",
  96: "notion 外观的文档页左右页边距",
  100: "notion 外观的文档底部留白",
};

const SPACING_PROP =
  /(?:^|[;{\s])(margin[a-z-]*|padding[a-z-]*|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g;

function maskComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
}

function collectStyleFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "node_modules" && entry !== "testing") collectStyleFiles(full, out);
    } else if (/\.(css|vue)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

export function findUnknownSpacing(text: string, file = ""): string[] {
  const known = new Set<number>([...LADDER, ...Object.keys(ALLOWED_EXCEPTIONS).map(Number)]);
  const css = maskComments(text);
  const findings: string[] = [];
  let m: RegExpExecArray | null;
  SPACING_PROP.lastIndex = 0;
  while ((m = SPACING_PROP.exec(css)) !== null) {
    const value = m[2].trim();
    // 派生值与相对单位不在本护栏管辖内：前者由 token 负责，后者跟着字号走
    if (value.includes("var(") || value.includes("calc(")) continue;
    for (const token of value.split(/\s+/)) {
      const px = /^(-?\d+(?:\.\d+)?)px$/.exec(token);
      if (!px) continue;
      const n = Number(px[1]);
      if (!known.has(n)) {
        const line = text.slice(0, m.index).split("\n").length;
        findings.push(`${file}:${line} ${m[1]}: ${value} — ${n}px 不在间距清单里`);
      }
    }
  }
  return findings;
}

describe("间距值不得无声增长", () => {
  test("全仓的间距值都在清单内", () => {
    const findings = collectStyleFiles("src").flatMap((f) =>
      findUnknownSpacing(readFileSync(f, "utf8"), f),
    );
    expect(findings).toEqual([]);
  });

  test("阶梯本身保持精简——档位变多就该回头看设计而不是继续加", () => {
    expect(LADDER.length).toBeLessThanOrEqual(12);
    expect(Object.keys(ALLOWED_EXCEPTIONS).length).toBeLessThanOrEqual(20);
  });

  test("每个例外都写了理由（护栏自检）", () => {
    const blank = Object.entries(ALLOWED_EXCEPTIONS).filter(([, why]) => why.trim().length < 8);
    expect(blank).toEqual([]);
  });

  test("扫描器认得出新冒出来的间距值（护栏自检）", () => {
    expect(findUnknownSpacing(`.a { padding: 13px; }`)).toHaveLength(1);
    expect(findUnknownSpacing(`.a { margin: 8px 12px; }`)).toEqual([]);
    // 简写里只有一个分量越界也要抓到
    expect(findUnknownSpacing(`.a { margin: 8px 13px; }`)).toHaveLength(1);
  });

  test("注释里的值与 var()/calc() 不参与判定（护栏自检）", () => {
    expect(findUnknownSpacing(`/* padding: 13px; */ .a { padding: 8px; }`)).toEqual([]);
    expect(findUnknownSpacing(`.a { padding: var(--ye-doc-padding-top); }`)).toEqual([]);
    expect(findUnknownSpacing(`.a { gap: calc(13px + 1px); }`)).toEqual([]);
  });

  test("rem / em / % 不归本护栏管（护栏自检）", () => {
    expect(findUnknownSpacing(`.a { margin-top: 2rem; padding: 0.5em 3%; }`)).toEqual([]);
  });
});
