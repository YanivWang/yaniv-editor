/**
 * 页码统计只算页数，**不得触碰页面尺寸 token**。
 *
 * 历史事故：`initPageCssVariables()` 把 A4 常量用内联 style 写到 `.document-container`
 * 上（`--ye-doc-page-width` / `--ye-doc-padding-*` / `--ye-doc-page-min-height`）。
 * 内联优先级高于任何选择器，于是三套 appearance 的尺寸设置**全部失效**——
 * 浏览器实测 default 的 900px 页宽被压成 794px、48px 内边距被压成 96px，
 * notion 的 708px 同样被压成 794px，连 word 自己的 939px 最小高度也被改成 931px。
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";

import { useEditorPagination } from "./useEditorPagination";

const makeContainer = (scrollHeight: number): HTMLElement => {
  const container = document.createElement("div");
  const pm = document.createElement("div");
  pm.className = "ProseMirror";
  Object.defineProperty(pm, "scrollHeight", { value: scrollHeight, configurable: true });
  container.append(pm);
  document.body.append(container);
  return container;
};

describe("useEditorPagination", () => {
  it("不向容器写入任何 --ye-doc-* 内联变量", async () => {
    const container = makeContainer(2000);
    const api = useEditorPagination(ref(container));
    api.calculatePages();
    await nextTick();

    expect(container.getAttribute("style")).toBeNull();
    for (const token of [
      "--ye-doc-page-width",
      "--ye-doc-padding-top",
      "--ye-doc-padding-bottom",
      "--ye-doc-page-min-height",
    ]) {
      expect(container.style.getPropertyValue(token), token).toBe("");
    }
  });

  it("返回值里不再有 initPageCssVariables", () => {
    const api = useEditorPagination(ref(makeContainer(100)));
    expect(Object.keys(api).sort()).toEqual(["calculatePages", "totalPages", "zoomLevel"]);
  });

  it("页数至少为 1，内容变高则页数增加", async () => {
    const shortApi = useEditorPagination(ref(makeContainer(10)));
    shortApi.calculatePages();
    await nextTick();
    expect(shortApi.totalPages.value).toBe(1);

    const tallApi = useEditorPagination(ref(makeContainer(1123 * 3)));
    tallApi.calculatePages();
    await nextTick();
    expect(tallApi.totalPages.value).toBeGreaterThan(1);
  });

  it("容器里没有 .ProseMirror 时不抛错、不改页数", async () => {
    const empty = document.createElement("div");
    const api = useEditorPagination(ref(empty));
    api.calculatePages();
    await nextTick();
    expect(api.totalPages.value).toBe(1);
  });
});

/**
 * 「共 N 页」按 A4 算是**有意的**，不是漏掉了外观差异。
 *
 * `--ye-doc-page-min-height` 不是页高——它是 `min-height`（default 480px 只表示
 * 「至少这么高」，notion 是 `calc(100vh - 100px)` 跟着视口走），而三套外观都是
 * 连续滚动布局，全仓没有任何画分页线的规则。界面上不存在「第 2 页」这个视觉对象，
 * `totalPages` 只是状态栏里「按 A4 打印大约多少页」的估算，与 Word 导出同口径。
 */
describe("分页口径", () => {
  it("固定用 A4 高度，不去读外观的 --ye-doc-* token", () => {
    const source = readFileSync("src/core/useEditorPagination.ts", "utf8");
    // 剥掉块注释：文件头正是在解释「为什么不读那个 token」，不能把说明当成用法
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "");

    expect(code).toContain("A4_HEIGHT_PX");
    expect(code).not.toMatch(/getPropertyValue\(\s*["'`]--ye-doc-/);
    expect(code).not.toContain("--ye-doc-page-min-height");
  });

  it("三套外观都没有画分页线的规则（页数因此只能是估算）", () => {
    const appearances = ["default", "notion", "word"];
    for (const name of appearances) {
      const css = readFileSync(`src/appearance/styles/${name}.css`, "utf8");
      // 真要画分页线，必然要在 .continuous-pages 上做重复背景 / 分隔渐变
      expect(css, `${name} 外观出现了分页线规则，页数口径需要重新讨论`).not.toMatch(
        /repeating-linear-gradient|page-break-after|break-after\s*:\s*page/,
      );
    }
  });
});
