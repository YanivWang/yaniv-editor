import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 9527);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  /**
   * 断言超时放宽到 15s（默认 5s）。
   *
   * webServer 的 `url` 探活只能说明 HTML 外壳出得来，而 demo 是 dev 模式下的 SPA：
   * 首次进某条路由时 Vite 还要现场转换懒加载的页面模块，以及本库十几个门控能力 chunk。
   * 能力按 gate 代码分割之后这部分明显变重，5s 断言窗口经常直接撞上冷启动的转换耗时——
   * 现象是 `.demo-controls` 之类"element(s) not found"，实测预热同一台机器后同样的
   * 用例 11/11 全过。
   *
   * 放宽不掩盖真失败：定位不到的元素依然会失败，只是从 5s 变成 15s，仍远小于
   * 单用例 60s 上限。这比继续依赖 CI 的 retries: 2 把首跑失败重试掉要诚实。
   */
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
