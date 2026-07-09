import { expect, test } from "@playwright/test";

import { expectEditorReady, focusEditorEnd, setDemoSelect } from "./helpers";

async function openSlashMenu(page: Parameters<typeof focusEditorEnd>[0]) {
  await focusEditorEnd(page);
  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await expect(page.locator(".block-picker-menu")).toBeVisible();
}

test.describe("Notion preset + appearance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/full-editor");
    await expect(page.locator(".demo-controls")).toBeVisible();
    await expectEditorReady(page);

    await setDemoSelect(page, "方案", "Notion");
    await setDemoSelect(page, "外观", "Notion");

    // preset / appearance 切换会重建 session；等可见下拉收起且编辑器就绪
    await expect(page.locator(".ant-select-dropdown:visible")).toHaveCount(0);
    await expect(page.locator(".yaniv-editor")).toHaveClass(/appearance-notion/);
    await expect(page.locator(".editor-header, .toolbar-nav")).toHaveCount(0);
    await expectEditorReady(page);
  });

  test("slash menu lists Notion block group", async ({ page }) => {
    await openSlashMenu(page);
    await expect(page.locator(".block-picker-group-title", { hasText: "Notion 块" })).toBeVisible();
    for (const title of ["折叠列表", "标注", "分栏", "嵌入/书签", "页面链接"]) {
      await expect(page.locator(".block-picker-item-title", { hasText: title })).toBeVisible();
    }
  });

  test("insert callout block with Notion styling", async ({ page }) => {
    await openSlashMenu(page);
    await page.locator(".block-picker-item-title", { hasText: "标注" }).click();
    const callout = page.locator(".callout-block").last();
    await expect(callout).toBeVisible();
    await expect(callout).toHaveAttribute("data-color", "default");
    await expect(callout.locator(".callout-block__icon")).toHaveText("💡");
    await expect(callout).toHaveCSS("display", "flex");
  });

  test("empty toggle block shows placeholder", async ({ page }) => {
    await openSlashMenu(page);
    await page.locator(".block-picker-item-title", { hasText: "折叠列表" }).click();
    const toggle = page.locator(".toggle-block").last();
    await expect(toggle).toHaveClass(/is-empty/);
    await expect(toggle).toHaveAttribute("data-placeholder", /唤起命令/);
    await expect(toggle).toHaveCSS("position", "relative");
  });

  test("column layout renders two columns", async ({ page }) => {
    await openSlashMenu(page);
    await page.locator(".block-picker-item-title", { hasText: "分栏" }).click();
    const layout = page.locator(".column-layout").last();
    await expect(layout).toBeVisible();
    await expect(layout.locator(".column-block")).toHaveCount(2);
    const first = layout.locator(".column-block").first();
    const second = layout.locator(".column-block").nth(1);
    const firstBox = await first.boundingBox();
    const secondBox = await second.boundingBox();
    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(secondBox!.x).toBeGreaterThan(firstBox!.x);
  });

  test("@ mention suggestion menu", async ({ page }) => {
    await focusEditorEnd(page);
    await page.keyboard.press("Enter");
    await page.keyboard.type("@");
    await expect(page.locator(".mention-suggestion-menu")).toBeVisible();
    await expect(
      page.locator(".mention-suggestion-menu__label", { hasText: "文档" }),
    ).toBeVisible();
  });

  test("markdown > creates callout when schema available", async ({ page }) => {
    await focusEditorEnd(page);
    await page.keyboard.press("Enter");
    await page.keyboard.type("> ");
    await expect(page.locator(".callout-block").last()).toBeVisible();
  });
});
