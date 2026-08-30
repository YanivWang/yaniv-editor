import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    /**
     * 挂载完整编辑器的集成测试要等门控能力的动态 import 解析（notion preset 有十余个
     * chunk），默认 5s 在 CI 这类较慢机器上会假失败。纯函数测试不受影响。
     */
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "lcov"],
      include: ["src/**/*.{ts,vue}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts", // 纯 barrel 转出
        "src/locales/{zh-CN,en-US}.ts", // 文案表，由 localeParity 校验而非行覆盖
        "src/**/*Icons.ts", // 静态图标常量
        "src/types/**",
      ],
      /**
       * 阈值取当前实测基线略下方（实测 57.3 / 58.9 / 45.2 / 53.1），只允许上调不允许下调。
       * 目的是拦住"整片未覆盖的新代码合入"，而不是追求某个漂亮数字。
       * 覆盖率下降时应补测试，而不是改这里。
       *
       * **为什么这些数字比 v0.2.0 之前低一大截**：vitest 4 的 v8 provider 改用
       * `ast-v8-to-istanbul` 做 AST 级重映射，且没有开关可以退回旧行为。
       * vitest 3 时代 statements 与 lines 的分子分母完全一致（都是 10788/14630），
       * 说明它其实是把行覆盖当作语句覆盖在报。换口径后三个维度各自变化方向不同：
       * statements 分母 14630 → 6996，branches 2376 → 3987，functions 992 → 1729。
       * 同一批 421 个测试、同一份源码，只是量得更准——不是覆盖劣化，
       * 也不是为了让门禁通过而下调阈值。
       *
       * **为什么不是 80%+**：以下模块是纯浏览器几何逻辑
       * （`getBoundingClientRect` / `posAtCoords` / HTML5 drag-and-drop），
       * jsdom 无布局引擎，强行做单测只能断言自己写的桩——功能坏了照样绿。
       * 它们的验收放在 Playwright E2E（真实 Chromium）：
       *
       * - `extensions/dragHandle/DragHandleExtension.ts` → `e2e/drag-handle.spec.ts`
       * - 浮层定位（AI 悬浮层 / 块菜单 / bubble menu）→ `e2e/overlay-z-index.spec.ts`
       *
       * 把这两块排除出统计能让数字明显好看，但那是修饰指标而不是提高质量，
       * 因此保留在分母里，如实反映。
       */
      thresholds: {
        statements: 56,
        lines: 56,
        branches: 44,
        functions: 52,
      },
    },
  },
});
