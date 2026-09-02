import { expect, test, type Page } from "@playwright/test";

import {
  assertNoRuntimeErrors,
  attachPageDiagnostics,
  expectEditorReady,
  readEditorHtml,
  setDemoSelect,
} from "./helpers";

/**
 * AI 建议浮层的挂载与定位 —— 只能在真实浏览器里验的那一部分。
 *
 * `aiSuggestionManager` 把浮层挂进 EditorShell 的 overlay portal，并按选区的
 * `getBoundingClientRect()` 定位。jsdom 里矩形恒为 0，位置断言问不出任何东西，
 * 所以这条链路此前**既没有单测也没有 E2E**（`aiSuggestionManager.test.ts` 有 399 行，
 * 覆盖的是流式与状态机那半）。这里补的正是那 90 余行。
 *
 * AI 请求走 `page.route` 拦截，回一段真实形状的 SSE：不打真实网络，
 * 但流式解析、增量渲染、接受/拒绝这条链路全部照常跑。
 */
const SUGGESTION = "这是 AI 改写后的文本";

/** 造一段 OpenAI 兼容的流式响应；分成多块，顺带验增量渲染 */
function sseBody(text: string): string {
  const chunks = [...text].map(
    (char) => `data: ${JSON.stringify({ choices: [{ delta: { content: char } }] })}\n\n`,
  );
  return chunks.join("") + "data: [DONE]\n\n";
}

async function seedAiConfig(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      "yaniv-ai-config",
      JSON.stringify({
        provider: "openai",
        endpoint: "https://ai.e2e.invalid/v1",
        model: "e2e-model",
        timeout: 30000,
        enabled: true,
        storageMode: "local",
        updatedAt: Date.now(),
      }),
    );
    // 与 store.ts 的 obfuscate 同构：base64(reverse(encodeURIComponent(key)))
    const obfuscate = (value: string) =>
      btoa(encodeURIComponent(value).split("").reverse().join(""));
    localStorage.setItem("yaniv-ai-apikey", obfuscate("sk-e2e"));
  });
}

async function openAiSuggestion(page: Page): Promise<void> {
  await page.goto("/#/full-editor");
  await expectEditorReady(page);
  // AI 只在 notion / 显式开启时进 gate；notion 预设自带
  await setDemoSelect(page, "方案", "Notion");
  await expectEditorReady(page);

  const paragraph = page.locator(".ProseMirror p").first();
  await paragraph.click();
  await paragraph.selectText();

  const portal = page.locator(".yaniv-editor__overlay-portal");
  await portal.locator("button", { hasText: "AI" }).first().click();
  await page.getByText("润色文本", { exact: true }).click();
}

test.describe("AI 建议浮层", () => {
  test("浮层挂进 overlay portal，定位落在视口内且贴着选区", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await seedAiConfig(page);
    await page.route("**/chat/completions", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody(SUGGESTION),
      }),
    );

    await openAiSuggestion(page);

    const popover = page.locator(".ai-suggestion-content");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText(SUGGESTION);

    // ① 挂载点：必须在 overlay portal 里（不变量：浮层不许挂 document.body）
    const insidePortal = await popover.evaluate(
      (el) => !!el.closest(".yaniv-editor__overlay-portal"),
    );
    expect(insidePortal, "AI 浮层必须挂在 overlay portal 内").toBe(true);

    // ② 定位：真的贴着选区，而不是缩在角落——jsdom 里这条问不出来
    const box = await popover.boundingBox();
    const anchor = await page.locator(".ProseMirror p").first().boundingBox();
    const viewport = page.viewportSize()!;
    expect(box && anchor).toBeTruthy();
    expect(box!.width, "浮层要有实际宽度").toBeGreaterThan(100);

    /**
     * ⚠️ 判据要挑**能让缺陷显形**的那一个。「x ≥ 0 且没超出视口」看着挺像回事，
     * 但把定位整个换成 `{ top: 0, left: 0 }` 也照样满足——变异验证当场证明了它是恒真的。
     * 真正区分得开的是**水平方向贴着选区起点**（实测差 12px，缩到角落则差 500 余）。
     */
    expect(Math.abs(box!.x - anchor!.x), "浮层要贴着选区的左缘").toBeLessThan(200);
    expect(box!.y, "浮层要落在选区附近，而不是视口顶端").toBeGreaterThan(anchor!.y - 250);
    expect(box!.y).toBeLessThan(anchor!.y + 350);
    expect(box!.x + box!.width, "不许被推出视口").toBeLessThanOrEqual(viewport.width + 1);

    assertNoRuntimeErrors(errors, "ai suggestion popover");
  });

  test("接受建议把改写写进文档，浮层随后收起", async ({ page }) => {
    const errors = attachPageDiagnostics(page);
    await seedAiConfig(page);
    await page.route("**/chat/completions", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody(SUGGESTION),
      }),
    );

    await openAiSuggestion(page);
    const popover = page.locator(".ai-suggestion-content");
    await expect(popover).toContainText(SUGGESTION);

    /**
     * 先站住肯定的一半：**正文里还没有**这段改写。
     *
     * ⚠️ 别拿 `getHTML()` 来判——建议在接受之前就以 `data-suggested-text` 属性挂在
     * `ai-highlight` 标记上了，整篇 HTML 一直包含它，这条断言会恒假。
     * 要问的是「用户在正文里看不看得到」，所以比对的是可见文本。
     */
    const content = page.locator(".ProseMirror");
    await expect(content).not.toContainText(SUGGESTION);

    // antd 会在两个汉字之间自动插一个空格（实际文本是「接 受」），按正则匹配
    await popover
      .locator("button")
      .filter({ hasText: /^接\s*受$/ })
      .click();

    await expect(popover).toBeHidden();
    await expect(content, "接受之后改写要落进正文").toContainText(SUGGESTION);
    await expect(
      page.locator(".ProseMirror .ai-highlight"),
      "接受之后高亮标记要收干净，否则下次点它还会弹出旧建议",
    ).toHaveCount(0);
    expect(await readEditorHtml(page)).not.toContain("data-suggested-text");

    assertNoRuntimeErrors(errors, "ai suggestion accept");
  });
});
