import { expect, test } from "@playwright/test";

import {
  assertNoRuntimeErrors,
  attachPageDiagnostics,
  expectEditorReady,
  setDemoSelect,
} from "./helpers";

/**
 * DragHandle 全是浏览器几何逻辑：`getBoundingClientRect` / `posAtCoords` /
 * `elementFromPoint` / HTML5 drag-and-drop。在 jsdom 里这些要么恒返回 0，要么不存在，
 * 于是单测只能断言自己写的桩——功能坏了照样绿。
 *
 * 因此这块的验收放在真实浏览器（Playwright）里，而不是靠单测覆盖率数字。
 */
test.describe("Drag handle（真实浏览器几何）", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/full-editor");
    await expect(page.locator(".demo-controls")).toBeVisible();
    await expectEditorReady(page);

    await setDemoSelect(page, "方案", "Notion");
    await expect(page.locator(".ant-select-dropdown:visible")).toHaveCount(0);
    await expectEditorReady(page);
  });

  test("鼠标移到块左侧留白时出现拖拽手柄与 + 号", async ({ page }) => {
    const errors = attachPageDiagnostics(page);

    const firstBlock = page.locator(".ProseMirror > *").first();
    await expect(firstBlock).toBeVisible();

    const box = await firstBlock.boundingBox();
    expect(box).not.toBeNull();

    // 移到块左侧的 gutter 区域
    await page.mouse.move(box!.x - 12, box!.y + box!.height / 2);

    await expect(page.locator(".drag-handle").first()).toBeVisible({
      timeout: 5000,
    });

    assertNoRuntimeErrors(errors, "drag handle hover");
  });

  test("+ 号打开块插入菜单", async ({ page }) => {
    const errors = attachPageDiagnostics(page);

    const firstBlock = page.locator(".ProseMirror > *").first();
    const box = await firstBlock.boundingBox();
    await page.mouse.move(box!.x - 12, box!.y + box!.height / 2);

    const plus = page.locator(".drag-handle-plus").first();
    await expect(plus).toBeVisible({ timeout: 5000 });
    await plus.click();

    await expect(page.locator(".block-picker-menu")).toBeVisible({ timeout: 5000 });
    assertNoRuntimeErrors(errors, "drag handle plus menu");
  });

  test("手柄菜单挂在 overlay portal 内（不落到 document.body）", async ({ page }) => {
    const firstBlock = page.locator(".ProseMirror > *").first();
    const box = await firstBlock.boundingBox();
    await page.mouse.move(box!.x - 12, box!.y + box!.height / 2);

    const handle = page.locator(".drag-handle").first();
    await expect(handle).toBeVisible({ timeout: 5000 });
    await handle.click();

    const menu = page.locator(".drag-handle-menu.is-visible");
    await expect(menu).toBeVisible({ timeout: 5000 });

    // 架构不变量 13：全局浮层必须挂在编辑器的 overlay portal 内
    const insidePortal = await menu.evaluate(
      (el) => el.closest(".yaniv-editor__overlay-portal") !== null,
    );
    expect(insidePortal).toBe(true);
  });

  test("鼠标移出编辑区后手柄隐藏", async ({ page }) => {
    const firstBlock = page.locator(".ProseMirror > *").first();
    const box = await firstBlock.boundingBox();

    await page.mouse.move(box!.x - 12, box!.y + box!.height / 2);
    const handle = page.locator(".drag-handle").first();
    await expect(handle).toBeVisible({ timeout: 5000 });

    // 移出编辑区：手柄靠 is-visible class 控制显隐
    await page.mouse.move(5, 5);
    await expect(page.locator(".drag-handle.is-visible")).toHaveCount(0, { timeout: 5000 });
  });

  test("preview 模式下不出现拖拽手柄", async ({ page }) => {
    // 模式是 Segmented 控件，不是 Select
    await page
      .locator(".demo-controls__field")
      .filter({ has: page.locator(".demo-controls__label", { hasText: "模式" }) })
      .locator(".ant-segmented-item", { hasText: "预览" })
      .click();
    await expect(page.locator('.yaniv-editor[data-phase="preview"]')).toBeVisible();

    const firstBlock = page.locator(".ProseMirror > *").first();
    const box = await firstBlock.boundingBox();
    await page.mouse.move(box!.x - 12, box!.y + box!.height / 2);

    // 手柄元素常驻 DOM，靠 is-visible 控制显隐；preview 下不得可见
    await expect(page.locator(".drag-handle.is-visible")).toHaveCount(0);
    await expect(page.locator(".drag-handle-plus.is-visible")).toHaveCount(0);
  });
});
