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
  const dropdown = page.locator(".ant-select-dropdown:visible").last();
  await dropdown.locator(`.ant-select-item-option[title="${optionTitle}"]`).click();
  await expect(page.locator(".ant-select-dropdown:visible")).toHaveCount(0);
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

/**
 * 顺着 Vue 应用实例找到当前的 tiptap Editor。
 *
 * demo 页没有把文档内容渲染到页面上，而有些断言**只看 DOM 是不够的**：
 * 比如图片拖拽改尺寸，拖动过程中写的是内联 `style`，即便「写回文档」那一步坏掉，
 * 页面看起来也完全正常——必须回文档确认 attrs 真的变了。
 */
const FIND_EDITOR = `(function () {
  const app = document.querySelector("#app").__vue_app__;
  const seen = new Set();
  const stack = [app._instance];
  while (stack.length) {
    const inst = stack.pop();
    if (!inst || seen.has(inst)) continue;
    seen.add(inst);
    const state = inst.setupState || {};
    for (const key of Object.keys(state)) {
      const raw = state[key];
      const value = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
      if (value && value.state && value.view && typeof value.getHTML === "function") {
        window.__yanivE2eEditor = value;
        return true;
      }
    }
    const walk = (vnode) => {
      if (!vnode || typeof vnode !== "object") return;
      if (vnode.component) stack.push(vnode.component);
      if (Array.isArray(vnode.children)) vnode.children.forEach(walk);
      else if (vnode.children && typeof vnode.children === "object")
        Object.values(vnode.children).forEach((c) => Array.isArray(c) && c.forEach(walk));
    };
    walk(inst.subTree);
  }
  return false;
})()`;

/** 取当前编辑器的文档 HTML（测试专用，见 {@link FIND_EDITOR} 的说明） */
export async function readEditorHtml(page: Page): Promise<string> {
  const found = await page.evaluate(FIND_EDITOR);
  expect(found, "页面里没找到 tiptap 编辑器实例").toBe(true);
  return page.evaluate(() =>
    (
      window as unknown as { __yanivE2eEditor: { getHTML: () => string } }
    ).__yanivE2eEditor.getHTML(),
  );
}

/** 往文档末尾插入一张图片（e2e 的固件：示例文档本身没有图片） */
export async function insertImageAtEnd(page: Page, src: string): Promise<void> {
  await page.evaluate(FIND_EDITOR);
  await page.evaluate((dataUrl) => {
    const editor = (window as unknown as { __yanivE2eEditor: Record<string, any> })
      .__yanivE2eEditor;
    editor.commands.focus("end");
    editor.commands.insertContent({ type: "image", attrs: { src: dataUrl } });
  }, src);
}
