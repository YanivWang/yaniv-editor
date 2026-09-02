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
       * 阈值取当前实测基线略下方（**第 17 棒实测 80.43 / 82.77 / 69.05 / 78.69**，
       * 各留约 2 个点余量吸收机器与依赖版本差异），只允许上调不允许下调。
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
       * **哪些部分确实只能靠 E2E**：真正依赖布局引擎的是「指针落在哪个元素上」
       * （`getBoundingClientRect` / `posAtCoords` / `elementFromPoint`）与 HTML5
       * drag-and-drop，jsdom 里要么恒为 0 要么不存在。它们的验收在 Playwright
       * （真实 Chromium）：浮层定位 → `e2e/overlay-z-index.spec.ts`，
       * 拖拽几何与换序 → `e2e/drag-handle.spec.ts`。
       *
       * ⚠️ 但**别把整个模块都推给 E2E**。这里原先写着
       * 「`DragHandleExtension.ts` 是纯浏览器几何逻辑，强行做单测只能断言自己写的桩」，
       * 据此让它长期零单测——实际上该文件里与布局无关的部分（块转换、菜单渲染、
       * 目标选择、插件生命周期与资源收回）占了绝大多数，把 `posAtCoords` 换成确定
       * 输入之后全都可测，而且一测就翻出 4 个真实缺陷（见 CHANGELOG）。
       * **判据是「这段逻辑要不要布局」，不是「这个文件属不属于交互层」。**
       *
       * 把剩下的几何部分排除出统计能让数字好看，但那是修饰指标而不是提高质量，
       * 因此保留在分母里，如实反映。
       *
       * **当前离满分还差什么**（第 17 棒末实测，按未覆盖行数排）：
       * `aiSuggestionManager.ts` 的浮层挂载与定位（92）、`DragHandleExtension.ts` 的
       * 拖拽几何（66）、`resizableImage.ts` 的拖拽改尺寸（48）、
       * `blockMenuActions.ts`（40）、`video.ts`（37）、`MentionSuggestionMenu.vue`（31）。
       * 前三个是上面说的「要布局才能测」的几何部分，后三个是常规逻辑，
       * 下一棒还想提档就从它们开始。
       *
       * ⚠️ **别把「该走 E2E」读成「已经有 E2E」**：`resizableImage.ts` 的拖拽改尺寸
       * 当前**既没有单测也没有 E2E**（`e2e/` 全文搜不到 resize 相关用例），
       * 属于真实的验收空白，不是「已交给 Playwright」。`aiSuggestionManager` 那 92 行
       * 也只有浮层的挂载点与 z-index 被 `overlay-z-index.spec.ts` 覆盖到，
       * 定位算得对不对没人验。
       *
       * 第 16 棒点名的三个常规组件（`BlockPickerMenu` 99 行、`ColorPicker` 50 行、
       * `AiSettingsModal` 44 行）已在第 17 棒补完，statements 77.58% → 80.43%。
       */
      thresholds: {
        statements: 78,
        lines: 80,
        branches: 67,
        functions: 76,
      },
    },
  },
});
