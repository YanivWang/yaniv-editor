import { expect, type Page } from "@playwright/test";

export function attachPageDiagnostics(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

export function assertNoRuntimeErrors(errors: string[], context: string): void {
  const relevant = errors.filter(
    (message) => !message.includes("favicon.ico") && !message.includes("Failed to load resource"),
  );
  expect(relevant, `${context} should have no console/page errors`).toEqual([]);
}

export async function setDemoSelect(page: Page, label: string, optionTitle: string) {
  const field = page.locator(".demo-controls__field").filter({
    has: page.locator(".demo-controls__label", { hasText: label }),
  });
  await field.locator(".ant-select-selector").click();
  const dropdown = page.locator(".ant-select-dropdown").last();
  await dropdown.locator(`.ant-select-item-option[title="${optionTitle}"]`).click();
  await page.keyboard.press("Escape");
}

export async function focusEditorEnd(page: Page) {
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await page.keyboard.press("Meta+ArrowDown");
}

export async function expectEditorReady(page: Page) {
  await expect(page.locator(".yaniv-editor").first()).toBeVisible();
  await expect(page.locator(".ProseMirror").first()).toBeVisible();
  await expect(page.locator(".yaniv-editor__overlay-portal").first()).toBeAttached();
}

export async function readBubbleZIndex(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.querySelector(".yaniv-editor");
    if (!(root instanceof HTMLElement)) return -1;

    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;z-index:var(--ye-z-bubble-menu)";
    root.appendChild(probe);
    const zIndex = Number.parseInt(getComputedStyle(probe).zIndex, 10);
    root.removeChild(probe);
    return Number.isFinite(zIndex) ? zIndex : -1;
  });
}

/** 选中编辑器内指定文本，触发 floating / bubble menu */
export async function selectEditorText(page: Page, text: string) {
  const target = page.locator(".ProseMirror").getByText(text, { exact: false }).first();
  await expect(target).toBeVisible();
  await target.click();
  // Playwright selectText 会建立真实用户选区，ProseMirror 能收到
  await target.selectText();
  await page.waitForTimeout(350);
}
