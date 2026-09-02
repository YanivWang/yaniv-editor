import { expect, test } from "@playwright/test";

import { assertNoRuntimeErrors, attachPageDiagnostics, expectEditorReady } from "./helpers";

/**
 * 查找替换：命中之间的跳转与替换之后，**选区要真的落到命中上**。
 *
 * 为什么必须在真实浏览器里验：这条不变量在第 16 棒是一条「jsdom 下选区没动」的挂起观察，
 * 按不变量 45 不能凭 jsdom 定性。第 17 棒在这里复验——**缺陷复现**，而且不止「替换」，
 * 「上一处 / 下一处」同样不动：`resultIndex` 与高亮装饰都换到了下一处，光标却纹丝不动。
 * 根因是命令实现内部又调 `editor.commands.*`（各自派发独立事务），外层命令自己的事务
 * 随后才派发、带着旧选区把它盖回去（不变量 58，另有静态护栏
 * `src/extensions/commandTransactionScope.test.ts`）。
 *
 * 这里断言 `window.getSelection()`——用户真正看得见的那一份，而不是内部状态。
 */
const SEARCH_TERM = "alpha";

async function openFindReplace(page: import("@playwright/test").Page) {
  const lastParagraph = page.locator(".ProseMirror > p").last();
  await lastParagraph.click();
  await page.keyboard.press("End");
  await page.keyboard.type(` ${SEARCH_TERM} beta ${SEARCH_TERM}`);

  await page.keyboard.press("Control+f");
  const dialog = page
    .locator(".ant-modal")
    .filter({ has: page.locator('input[placeholder="查找"]') });
  await expect(dialog).toBeVisible();
  await dialog.locator('input[placeholder="查找"]').fill(SEARCH_TERM);
  await expect(page.locator(".ProseMirror .search-result")).toHaveCount(2);
  return dialog;
}

test.describe("查找替换的选区落点", () => {
  test("「下一处」把光标带到命中上，而不是只换高亮", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await page.goto("/#/full-editor");
    await expectEditorReady(page);

    const dialog = await openFindReplace(page);
    await dialog.locator("button", { hasText: "下一处" }).click();

    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString() ?? ""))
      .toBe(SEARCH_TERM);

    assertNoRuntimeErrors(errors, "find/replace navigate");
  });

  test("「替换」之后选区落到剩下的那个命中上", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await page.goto("/#/full-editor");
    await expectEditorReady(page);

    const dialog = await openFindReplace(page);
    await dialog.locator('input[placeholder="替换为"]').fill("ZZZ");
    await dialog
      .locator("button")
      .filter({ hasText: /^替\s*换$/ })
      .click();

    // 只换掉当前这一个
    await expect(page.locator(".ProseMirror .search-result")).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString() ?? ""))
      .toBe(SEARCH_TERM);

    assertNoRuntimeErrors(errors, "find/replace replace once");
  });
});
