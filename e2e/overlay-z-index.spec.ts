import { expect, test } from "@playwright/test";

import {
  assertNoRuntimeErrors,
  attachPageDiagnostics,
  expectEditorReady,
  readBubbleZIndex,
  selectEditorText,
} from "./helpers";

test.describe("Overlay portal & z-index", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/full-editor");
    await expectEditorReady(page);
  });

  test("overlay portal lives inside editor root", async ({ page }) => {
    const portal = page.locator(".yaniv-editor .yaniv-editor__overlay-portal");
    await expect(portal).toHaveCount(1);
  });

  test("bubble-menu z-index token resolves to base + 10", async ({ page }) => {
    const zIndex = await readBubbleZIndex(page);
    expect(zIndex).toBe(1010);
  });

  test("text selection shows floating menu without z-index errors", async ({ page }) => {
    const errors = attachPageDiagnostics(page);

    await selectEditorText(page, "AI 悬浮菜单");

    const floatingMenu = page.locator(".yaniv-editor__overlay-portal .floating-menu");
    await expect(floatingMenu).toBeVisible({ timeout: 10_000 });

    assertNoRuntimeErrors(errors, "floating menu");
  });

  test("link bubble menu appears when selecting a link", async ({ page }) => {
    const errors = attachPageDiagnostics(page);

    const link = page.locator(".ProseMirror a[href='https://example.com']");
    await expect(link).toBeVisible();
    await link.selectText();
    await page.waitForTimeout(350);

    const linkBubble = page.locator(".yaniv-editor__overlay-portal .link-bubble-menu");
    await expect(linkBubble).toBeVisible({ timeout: 10_000 });
    await expect(linkBubble.locator(".link-url-text")).toContainText("example.com");

    assertNoRuntimeErrors(errors, "link bubble menu");
  });
});
