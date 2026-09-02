import { expect, test } from "@playwright/test";

import { assertNoRuntimeErrors, attachPageDiagnostics, expectEditorReady } from "./helpers";

/**
 * 会话重建：切换语言 / 切换 mode 之后，编辑器与用户内容都必须还在。
 *
 * 第 11~13 棒在这一带修了三个用户直接可感知的缺陷，而它们全是**渲染时序**问题
 * ——单测跑在 jsdom 里，没有真实布局也没有真实的 patch 时机，问题的形态在那里
 * 与浏览器并不一致（`insertBefore of null` 在 jsdom 里表现为 unhandled rejection，
 * 真实浏览器未必如此）。所以这些场景必须有一份真实浏览器的回归。
 *
 * 覆盖的三个缺陷：
 * 1. 切语言丢掉用户正在编辑的全部内容（两次 rebuild 重叠，内容快照被前一次用掉清空）
 * 2. 切语言后编辑器永久停在加载骨架屏（渲染错误让 `await nextTick()` reject，
 *    异常经 `void rebuild()` 逃逸，status 卡在 "loading"）
 * 3. `mode` 在 edit / preview 间往返后撤销按钮变灰（编辑器与历史都还在，
 *    只是工具栏组件重挂后把本地标记清零了）
 *
 * ⚠️ 补这套用例时顺带纠正了一条判断：第 12 棒记的「浮层在已被摘走的容器上抛
 * `insertBefore of null`」**只在 jsdom 里出现**。把那处修复回退掉，在真实浏览器里
 * 切 locale 往返 3 轮、切 mode 往返 3 轮，`error` / `unhandledrejection` /
 * `console.error` 全为空。所以下面的 `assertNoRuntimeErrors` 抓不到它——
 * 它抓的是「真实浏览器里确实会冒出来的错」，这正是它该有的口径。
 */

/**
 * 往第 index 个编辑器里敲一段可识别的文字。
 *
 * 点的是文档**最后一个顶层段落**，不是编辑器本身：`locator.click()` 默认点在元素
 * 中心，而 full-editor 的示例文档中部是表格，光标会落进单元格甚至不可编辑处，
 * 字就敲不进去（实测在真实浏览器里手动把选区放到文末再输入是成功的，
 * 说明编辑器本身没问题，是落点问题）。`focusEditorEnd` 的 `Meta+ArrowDown`
 * 在这个文档上也带不到文末。
 */
async function typeInto(page: import("@playwright/test").Page, index: number, text: string) {
  const editor = page.locator(".ProseMirror").nth(index);
  await editor.locator("> p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.type(text);
  await expect(editor).toContainText(text);
}

test.describe("会话重建后编辑器与内容都还在", () => {
  test("切换语言：内容保留、编辑器就绪、无运行时错误", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await page.goto("/#/multi-instance");
    await expectEditorReady(page);

    const marker = "会话重建回归标记";
    await typeInto(page, 0, marker);

    // 编辑器 A 的语言：中文 → English
    const panelA = page.locator(".demo-multi-panel__section").first();
    await panelA.locator(".ant-segmented-item", { hasText: "English" }).click();

    // 重建是异步的（语言代码同步变、语言包异步落地，两次 rebuild 重叠）
    const editorA = page.locator(".ProseMirror").first();
    await expect(editorA).toBeVisible();
    await expect(editorA).toContainText(marker);
    // 卡在 loading 时骨架屏会一直挂着
    await expect(page.locator(".yaniv-editor__skeleton")).toHaveCount(0);
    await expect(page.locator(".yaniv-editor__error")).toHaveCount(0);

    // 再切回中文，仍然不能丢
    await panelA.locator(".ant-segmented-item", { hasText: "中文" }).click();
    await expect(editorA).toContainText(marker);
    await expect(page.locator(".yaniv-editor__skeleton")).toHaveCount(0);

    assertNoRuntimeErrors(errors, "切换语言");
  });

  test("切换语言只影响被切的那个实例", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await page.goto("/#/multi-instance");
    await expectEditorReady(page);

    await typeInto(page, 0, "甲实例内容");
    await typeInto(page, 1, "乙实例内容");

    const panelA = page.locator(".demo-multi-panel__section").first();
    await panelA.locator(".ant-segmented-item", { hasText: "English" }).click();

    await expect(page.locator(".ProseMirror").first()).toContainText("甲实例内容");
    await expect(page.locator(".ProseMirror").nth(1)).toContainText("乙实例内容");
    assertNoRuntimeErrors(errors, "切换单个实例的语言");
  });

  test("mode 在编辑/预览间往返后，撤销按钮仍然可用", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await page.goto("/#/full-editor");
    await expectEditorReady(page);

    await typeInto(page, 0, "撤销回归标记");

    const undo = page.locator('button.ye-toolbar-button[aria-label="撤销"]');
    await expect(undo).toBeEnabled();

    const modeField = page.locator(".demo-controls__field").filter({
      has: page.locator(".demo-controls__label", { hasText: "模式" }),
    });
    await modeField.locator(".ant-segmented-item", { hasText: "预览" }).click();
    // 预览态整个编辑 chrome 都不渲染
    await expect(undo).toHaveCount(0);

    await modeField.locator(".ant-segmented-item", { hasText: "编辑" }).click();
    await expectEditorReady(page);

    // 编辑器实例与历史栈从未销毁，重挂出来的按钮必须还能点
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(page.locator(".ProseMirror").first()).not.toContainText("撤销回归标记");

    assertNoRuntimeErrors(errors, "mode 往返");
  });
});
