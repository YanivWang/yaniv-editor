import { expect, test } from "@playwright/test";

import {
  assertNoRuntimeErrors,
  attachPageDiagnostics,
  expectEditorReady,
  setDemoSelect,
} from "./helpers";

/**
 * DragHandle 里**依赖真实布局的那部分**：gutter 命中、hover 显隐、菜单相对块的
 * 几何关系、HTML5 drag-and-drop。jsdom 里 `getBoundingClientRect` 恒为 0、
 * `elementFromPoint` / `DataTransfer` 根本不存在，这些只能在真实 Chromium 里验。
 *
 * ⚠️ 与之相对，**块转换、菜单渲染、目标选择、生命周期与资源收回不需要布局**，
 * 由 `src/extensions/dragHandle/DragHandleExtension.test.ts` 在 jsdom 里覆盖。
 * 这里原先写的是「整个扩展只能靠 E2E」，那个判断让该文件长期零单测，
 * 藏了 4 个缺陷（见 CHANGELOG）。两边不重叠，别把整个模块推给任意一边。
 *
 * 本文件里的「块菜单 / 块选择器移上去不消失」两条尤其依赖真实几何：
 * 缺陷的触发条件正是「浮层比触发它的块高得多」，jsdom 里所有 rect 相同，测不出来。
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

  test("块菜单的「转换为」在真实浏览器里改块类型，且不丢行内格式", async ({ page }) => {
    const errors = attachPageDiagnostics(page);

    // Notion 示例的第二个块是带 <code> 的段落——现成的 mark，用来验证转换不吃格式
    const target = page.locator(".ProseMirror > *").nth(1);
    await expect(target).toHaveText(/Notion 方案/);
    expect(await target.evaluate((el) => el.tagName)).toBe("P");
    expect(await target.locator("code").count()).toBeGreaterThan(0);

    const box = await target.boundingBox();
    await page.mouse.move(box!.x - 12, box!.y + box!.height / 2);

    const handle = page.locator(".drag-handle").first();
    await expect(handle).toBeVisible({ timeout: 5000 });
    await handle.click();

    const menu = page.locator(".drag-handle-menu.is-visible");
    await expect(menu).toBeVisible({ timeout: 5000 });

    // 子菜单靠 :hover / :focus-within 展开，是 CSS 行为，只有真实浏览器测得到
    await menu.locator('[data-item-id="turnInto"]').hover();
    const submenuItem = menu.locator('[data-item-id="heading1"]');
    await expect(submenuItem).toBeVisible({ timeout: 5000 });
    await submenuItem.click();

    const converted = page.locator(".ProseMirror > *").nth(1);
    await expect(converted).toHaveText(/Notion 方案/);
    expect(await converted.evaluate((el) => el.tagName)).toBe("H1");
    // 转换只该换块类型：行内的 <code> 必须原样还在
    expect(await converted.locator("code").count()).toBeGreaterThan(0);

    assertNoRuntimeErrors(errors, "drag handle turn into");
  });

  test("鼠标移到块选择器上时插入菜单不会自己关掉", async ({ page }) => {
    // 必须挑**矮**块（Notion 示例第二个块是 26px 的段落）：块越矮，指针 Y 越早
    // 落到块的判定范围之外，正是这个缺陷显形的条件
    const firstBlock = page.locator(".ProseMirror > *").nth(1);
    const box = await firstBlock.boundingBox();
    await page.mouse.move(box!.x - 12, box!.y + box!.height / 2);

    const plus = page.locator(".drag-handle-plus").first();
    await expect(plus).toBeVisible({ timeout: 5000 });
    await plus.click();

    const picker = page.locator(".block-picker-menu");
    await expect(picker).toBeVisible({ timeout: 5000 });

    /**
     * 块选择器比触发它的块高一个数量级（实测段落 26px、选择器 340px）。
     * 按指针 Y 重新做块命中会命中选择器下方的块，从而把它关掉——鼠标还没走到
     * 第一项就消失了。这里把指针一路移到选择器底部，全程必须仍然可见。
     */
    const pickerBox = await picker.boundingBox();
    for (const fraction of [0.1, 0.5, 0.9]) {
      await page.mouse.move(
        pickerBox!.x + pickerBox!.width / 2,
        pickerBox!.y + pickerBox!.height * fraction,
      );
      await expect(picker).toBeVisible();
    }
  });

  test("拖拽手柄可以给块换序", async ({ page }) => {
    const errors = attachPageDiagnostics(page);

    const readOrder = () =>
      page
        .locator(".ProseMirror > *")
        .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim().slice(0, 8)));

    const before = await readOrder();
    expect(before.length).toBeGreaterThan(2);

    // 拖第二个块到第一个块上方
    const source = page.locator(".ProseMirror > *").nth(1);
    const sourceBox = await source.boundingBox();
    await page.mouse.move(sourceBox!.x - 12, sourceBox!.y + sourceBox!.height / 2);

    const handle = page.locator(".drag-handle").first();
    await expect(handle).toBeVisible({ timeout: 5000 });
    const handleBox = await handle.boundingBox();

    const first = page.locator(".ProseMirror > *").first();
    const firstBox = await first.boundingBox();

    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await page.mouse.down();
    // 多走几步：一次跳到目标点浏览器不会当成拖拽
    await page.mouse.move(firstBox!.x + 40, firstBox!.y + firstBox!.height / 2, { steps: 10 });
    await page.mouse.move(firstBox!.x + 40, firstBox!.y + 2, { steps: 5 });
    await page.mouse.up();

    const after = await readOrder();
    expect(after).not.toEqual(before);
    expect(after[0]).toBe(before[1]);

    assertNoRuntimeErrors(errors, "drag handle reorder");
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
