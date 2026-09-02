import { expect, test } from "@playwright/test";

import {
  assertNoRuntimeErrors,
  attachPageDiagnostics,
  expectEditorReady,
  insertImageAtEnd,
  readEditorHtml,
} from "./helpers";

/**
 * 图片拖拽改尺寸 —— 只能在真实浏览器里验的那一部分。
 *
 * `resizableImage.ts` 的这段逻辑全靠 `clientX/Y`、`offsetWidth`、`naturalWidth`：
 * jsdom 里它们要么不存在要么恒为 0，做不出有意义的断言。
 * 而在第 17 棒之前它**既没有单测也没有 E2E**（`vitest.config.ts` 的注释一度写着
 * 「验收在 Playwright」，实际上并没有这条用例）——本文件把这个空白补上。
 *
 * 断言分两层，缺一不可：
 * ① 页面上图片真的变大了（拖拽过程写的是内联 style）；
 * ② **尺寸写进了文档**（`getHTML()` 里有 width/height 属性）。只验 ① 的话，
 *    「写回文档」那一步整个坏掉也照样绿——用户当场看着是对的，一保存就丢。
 */
const SAMPLE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAA8CAIAAAAiz+n/AAAAaklEQVR42u3QQQ0AAAgEoEtnMDMZ0BbOBxsJSPVwIApEi0a0aNEWRItGtGjRFkSLRrRo0YgWjWjRohEtGtGiRSNaNKJFi0a0aESLFo1o0YgWLRrRohEtWjSiRSNatGhEi0a0aNGIFo3oXxYZTcHo/SoS2wAAAABJRU5ErkJggg==";

test.describe("图片拖拽改尺寸", () => {
  test("拖右下角手柄放大图片，并把尺寸写进文档", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await page.goto("/#/full-editor");
    await expectEditorReady(page);

    await insertImageAtEnd(page, SAMPLE_PNG);
    const image = page.locator('.ProseMirror img[src^="data:image/png"]');
    await expect(image).toBeVisible();

    // 选中图片，右下角手柄才可见
    await image.click();
    const handle = page.locator(".ProseMirror .resize-handle").last();
    await expect(handle).toBeVisible();

    // demo 底部有一条固定的缩放工具条：图片落在它下面时手柄会被整个盖住，
    // 鼠标事件会打在工具条上，而现象只是「拖了没反应」。先把图片滚到视口中间。
    await image.evaluate((el) => el.scrollIntoView({ block: "center" }));

    const before = await image.boundingBox();
    // 用 hover() 而不是自己算坐标：它带 actionability 检查，被遮住会直接报错而不是静默失败
    await handle.hover();
    const grip = await handle.boundingBox();
    expect(before && grip).toBeTruthy();

    await page.mouse.down();
    // 等比缩放取 |dx| 与 |dy| 中较大的那个，这里让 dx 说了算
    await page.mouse.move(grip!.x + 160, grip!.y + 20, { steps: 12 });
    await page.mouse.up();

    const after = await image.boundingBox();
    expect(after!.width, "拖完图片要真的变宽").toBeGreaterThan(before!.width + 50);

    /**
     * 尺寸在文档里是**内联 style**而不是 `width` 属性——`ResizableImage.renderHTML`
     * 有意这么做（见该文件 `createSizeAttribute` 的注释：只解析属性会让每次 HTML
     * 往返丢尺寸，所以写 style、解析时两条都读）。断言要贴着这个契约走。
     */
    const html = await readEditorHtml(page);
    const width = /<img[^>]*style="[^"]*width:\s*(\d+)px/.exec(html)?.[1];
    expect(width, `尺寸要写进文档，实际 HTML 尾部：${html.slice(-160)}`).toBeTruthy();
    expect(Number(width)).toBeGreaterThan(before!.width + 50);

    assertNoRuntimeErrors(errors, "image resize");
  });

  test("只点一下手柄不拖动，文档一个字都不变", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await page.goto("/#/full-editor");
    await expectEditorReady(page);

    await insertImageAtEnd(page, SAMPLE_PNG);
    const image = page.locator('.ProseMirror img[src^="data:image/png"]');
    await image.click();
    await image.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const handle = page.locator(".ProseMirror .resize-handle").last();
    await expect(handle).toBeVisible();

    const before = await readEditorHtml(page);
    await handle.click();
    const after = await readEditorHtml(page);

    /**
     * 只点不拖时 `img.style.height` 还是 `auto`，算不出合法尺寸——此时**不能写文档**：
     * 写了既会脏一次文档、多一步撤销，也会把当前渲染宽度钉死成属性
     * （`handleMouseUp` 里那条 `finalWidth === null` 早退就是挡这个的）。
     *
     * ⚠️ 只断言「没有 NaN」挡不住这条：去掉早退后写进去的是 `width: 120px`，
     * 干干净净、一点也不像 bug——变异验证当场证明了这一点，所以这里比对整份 HTML。
     */
    expect(after, "点一下手柄不该改动文档").toBe(before);
    await expect(image).toBeVisible();

    // ⚠️ 断言范围要收到 `<img>` 标签内：整篇 HTML 带着 base64 图片数据，
    // 而这段 base64 里恰好含有 `NaN`（`…RSNaNKJ…`），整篇找子串会被它误伤。
    const imgTag = /<img\b[^>]*>/.exec(after)?.[0];
    expect(imgTag, "文档里应当有这张图").toBeTruthy();
    expect(imgTag!).not.toMatch(/width:\s*(NaN|auto)/);

    assertNoRuntimeErrors(errors, "image resize click only");
  });
});
