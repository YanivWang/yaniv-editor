import { copyFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import type { OutputAsset, OutputBundle, OutputChunk } from "rollup";
import type { Plugin, UserConfig } from "vite";

/**
 * 入口分组 → 产出的 CSS 文件名。
 * `style` / `inline-style` 是纯 CSS 入口（src/styles/*.css），其产物含 variables.css，
 * 必须排在同组组件 SFC 样式之前，否则 --ye-* token 后定义会被组件样式先读到。
 */
const CSS_ENTRY_GROUPS = [
  { output: "style.css", cssEntry: "style", codeEntries: ["index", "ai"] },
  { output: "inline.css", cssEntry: "inline-style", codeEntries: ["inline"] },
] as const;

function getAssetSource(asset: OutputAsset): string {
  return typeof asset.source === "string"
    ? asset.source
    : Buffer.from(asset.source as Uint8Array).toString("utf-8");
}

/** KaTeX 字体样式由接入方 `import 'katex/dist/katex.min.css'` 提供，不打入包内 */
function isKatexCss(source: string): boolean {
  return source.includes("font-family:KaTeX");
}

function isCssOnlyEntryChunk(chunk: OutputChunk): boolean {
  if (!chunk.isEntry) return false;
  if (chunk.name !== "style" && chunk.name !== "inline-style") return false;
  return chunk.code.trim() === "";
}

type ChunkCssMeta = { viteMetadata?: { importedCss?: Set<string> } };

/**
 * 按「入口可达性」把 CSS 资产分配给 style.css / inline.css。
 *
 * 背景：Vue SFC 的 `<style>` 会随所属 JS chunk 产出独立 CSS 资产。full 与 inline 两个入口
 * 共享 EditorShell chunk，因此共享其组件样式；但 inline 不应背上 full 专属的
 * document-layout / table / outline / drag-handle / appearance 等整包样式。
 *
 * 旧实现把 style.css 全量拼进 inline.css（inline.css 139KB > style.css 114KB），
 * 与 inline 入口「评论 / 表单轻量场景」的定位冲突。这里改为沿 rollup import 图
 * 从各入口做传递闭包，只收该入口真正可达的 CSS。
 */
function consolidateLibCssPlugin(): Plugin {
  return {
    name: "yaniv-consolidate-lib-css",
    generateBundle(_, bundle: OutputBundle) {
      const chunks = Object.values(bundle).filter(
        (item): item is OutputChunk => item.type === "chunk",
      );
      const chunkByFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));

      /** 从入口 chunk 沿静态 import 做传递闭包，收集途经 chunk 的 importedCss */
      const reachableCss = (entryName: string): string[] => {
        const entry = chunks.find((chunk) => chunk.isEntry && chunk.name === entryName);
        if (!entry) return [];

        const seen = new Set<string>();
        const queue = [entry.fileName];
        const css: string[] = [];

        while (queue.length) {
          const fileName = queue.shift()!;
          if (seen.has(fileName)) continue;
          seen.add(fileName);

          const chunk = chunkByFileName.get(fileName);
          if (!chunk) continue;

          const imported = (chunk as ChunkCssMeta).viteMetadata?.importedCss;
          if (imported) {
            for (const name of imported) if (!css.includes(name)) css.push(name);
          }
          queue.push(...chunk.imports, ...chunk.dynamicImports);
        }

        return css;
      };

      for (const group of CSS_ENTRY_GROUPS) {
        // 纯 CSS 入口在前（variables.css 必须最先），再按可达顺序追加组件样式
        const ordered = [
          ...reachableCss(group.cssEntry),
          ...group.codeEntries.flatMap((entry) => reachableCss(entry)),
        ].filter((name, index, all) => all.indexOf(name) === index);

        const parts: string[] = [];
        for (const fileName of ordered) {
          const asset = bundle[fileName];
          if (!asset || asset.type !== "asset") continue;
          const source = getAssetSource(asset);
          if (isKatexCss(source)) continue;
          parts.push(source);
        }

        if (!parts.length) continue;

        bundle[group.output] = {
          type: "asset",
          fileName: group.output,
          names: [group.output],
          originalFileNames: [],
          needsCodeReference: false,
          source: parts.join("\n"),
        } as OutputAsset;
      }

      for (const [key, item] of Object.entries(bundle)) {
        if (item.type === "chunk") {
          if (isCssOnlyEntryChunk(item)) delete bundle[key];
          continue;
        }
        // 分片 CSS 已并入 style.css / inline.css；未被任一入口引用的孤立 CSS 同样丢弃
        if (item.fileName.endsWith(".css") && item.fileName.startsWith("assets/")) {
          delete bundle[key];
        }
      }
    },
  };
}

/** vite-plugin-dts may emit declarations for CSS-only entries; they are not public API. */
function removeCssEntryDeclarationsPlugin(): Plugin {
  return {
    name: "yaniv-remove-css-entry-declarations",
    closeBundle() {
      for (const fileName of ["style.d.ts", "inline-style.d.ts"]) {
        const filePath = resolve(__dirname, "dist", fileName);
        if (existsSync(filePath)) unlinkSync(filePath);
      }
    },
  };
}

/**
 * 把声明文件里的 `declare module "..."` 增强块**按文本排序**，让输出稳定。
 *
 * `vite-plugin-dts` 发射这些块时没有稳定排序：**同一个 commit、同一台机器连跑两次，
 * `{index,ai,inline}.d.ts` 里 17 个 `declare module "@tiptap/core"` 块的先后就会不同**
 * （2026-09-05 实测；也正因如此 0.3.0 的 tarball 有 6 个声明文件永远无法逐字节复现）。
 * 块之间只是 TS 的声明合并，顺序不影响语义，排序是安全的。
 *
 * ## 根因（2026-09-05 定位到具体一行，**是第三方包的 bug，不是本仓库的**）
 *
 * `unplugin-dts`（`vite-plugin-dts` 的依赖）`dist/shared/unplugin-dts.*.mjs`：
 *
 * ```js
 * await runParallel(cpus().length, Array.from(declarationFiles.entries()),
 *   async ([filePath, content]) => {
 *     …
 *     declareModules.push(...result.declareModules);   // ← 并发回调里往共享数组 push
 *   });
 * const declared = declareModules.join("\n");          // ← 原样拼进 bundle 后的 d.ts
 * ```
 *
 * push 的顺序 = 各文件**处理完成**的顺序，与输入顺序无关 ⟹ 每次构建都可能不同。
 * 修法很小：`runParallel` 本身 `return Promise.all(ret)`，**返回值是按输入顺序的**，
 * 所以让回调 `return result.declareModules`、再从返回值按序 flat 即可。
 *
 * ⚠ `vite-plugin-dts@5.1.0`（unplugin-dts 1.1.0，2026-09-05 时的 latest）**仍未修**，
 * 三次构建实测仍不同 ⟹ 上游大概率还没发现，值得开个 issue/PR。
 *
 * ⚠ 为什么不用 `pnpm patch` 直接改依赖：**这不是致命问题**——声明合并与顺序无关，
 * 不影响任何运行时行为，只影响「两次构建能否逐字节一致」。为它把依赖版本钉死、
 * 每次升级都要重做补丁，代价大于收益。等上游修了，**把这个插件整个删掉**即可。
 *
 * ⚠ 必须排在 `emitCjsTypeDeclarationsPlugin()` **之前**——`.d.cts` 是从 `.d.ts` 复制的，
 * 先复制再排序会让两者不一致。
 */
function sortAmbientModuleBlocksPlugin(): Plugin {
  return {
    name: "yaniv-sort-ambient-module-blocks",
    closeBundle() {
      for (const entry of ["index", "inline", "ai"]) {
        const filePath = resolve(__dirname, "dist", `${entry}.d.ts`);
        if (!existsSync(filePath)) continue;

        const source = readFileSync(filePath, "utf-8");
        // 顶层块：从行首的 `declare module "..." {` 到行首的 `}`
        const blockRe = /^declare module "[^"]+" \{\n[\s\S]*?^\}\n/gm;
        const blocks: string[] = [];
        const spans: Array<[number, number]> = [];
        for (let m = blockRe.exec(source); m; m = blockRe.exec(source)) {
          blocks.push(m[0]);
          spans.push([m.index, m.index + m[0].length]);
        }
        if (blocks.length < 2) continue;

        /**
         * 块与块之间**只允许是空白**（实测是一个空行）。夹着别的声明就说明这些块不连续，
         * 重排会改变它们与那些声明的相对位置 —— 这时宁可不排。
         * 分隔符按位置原样保留，不做归一，避免顺带改动空行风格。
         */
        const separators: string[] = [];
        let contiguous = true;
        for (let i = 1; i < spans.length; i++) {
          const gap = source.slice(spans[i - 1][1], spans[i][0]);
          if (gap.trim() !== "") {
            contiguous = false;
            break;
          }
          separators.push(gap);
        }
        if (!contiguous) continue;

        const start = spans[0][0];
        const end = spans[spans.length - 1][1];
        const sorted = [...blocks].sort();
        let rebuilt = sorted[0];
        for (let i = 1; i < sorted.length; i++) rebuilt += separators[i - 1] + sorted[i];
        if (rebuilt === source.slice(start, end)) continue;

        writeFileSync(filePath, source.slice(0, start) + rebuilt + source.slice(end), "utf-8");
      }
    },
  };
}

/**
 * 为 CJS 产物补一份 `.d.cts` 声明。
 *
 * 本包是 `"type": "module"`，在 `node16` / `nodenext` 解析下，`.d.ts` 一律被当成 **ESM 类型**。
 * `exports.require` 若指回 `.d.ts`，CJS 侧接入方会拿到 “这些 import 会编译成 require”
 * 一类的报错（`arethetypeswrong` 的 Masquerading as ESM）。声明文件已由 `bundleTypes`
 * 打成自包含的单文件（无任何相对 import），因此直接复制即可，无需重写路径。
 */
function emitCjsTypeDeclarationsPlugin(): Plugin {
  return {
    name: "yaniv-emit-cjs-type-declarations",
    closeBundle() {
      for (const entry of ["index", "inline", "ai"]) {
        const source = resolve(__dirname, "dist", `${entry}.d.ts`);
        if (existsSync(source)) copyFileSync(source, resolve(__dirname, "dist", `${entry}.d.cts`));
      }
    },
  };
}

const libConfig: UserConfig = {
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      outDir: "dist",
      // vite-plugin-dts 5（改由 unplugin-dts 驱动）把 rollupTypes 更名为 bundleTypes；
      // 旧名会被静默忽略，导致 d.ts 退化成 `export * from './src/index.js'` 的空壳。
      bundleTypes: true, // Bundle all .d.ts into one file
      strictOutput: false,
      /**
       * 这两个弹层组件不从任何入口导出（非公开 API），却会把 ant-design-vue Popover
       * 的整条类型链拖进声明打包：实测 ai.d.ts +2.2KB、构建耗时 14s → 49s。
       * 原注释说的 "vue-types path issues" 已不成立（vue-types 直接依赖与对应的
       * tsconfig paths 映射都已移除），保留排除项的理由是产物体积与构建耗时。
       */
      exclude: [
        "src/features/ai/shared/CustomAiPopover.vue",
        "src/features/ai/shared/AiSuggestionPopover.vue",
      ],
    }),
    consolidateLibCssPlugin(),
    removeCssEntryDeclarationsPlugin(),
    sortAmbientModuleBlocksPlugin(),
    emitCjsTypeDeclarationsPlugin(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@yanivjs/yaniv-editor/style.css": resolve(__dirname, "src/styles/index.css"),
      "@yanivjs/yaniv-editor/inline.css": resolve(__dirname, "src/styles/inline.css"),
      "@yanivjs/yaniv-editor/inline": resolve(__dirname, "src/inline.ts"),
      "@yanivjs/yaniv-editor/ai": resolve(__dirname, "src/ai.ts"),
      "@yanivjs/yaniv-editor": resolve(__dirname, "src/index.ts"),
    },
  },
  server: {
    port: 9527,
  },
  build: {
    // Modern browsers that support CSS nesting
    target: ["es2022", "chrome105", "safari16", "firefox110", "edge105"],
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        inline: resolve(__dirname, "src/inline.ts"),
        ai: resolve(__dirname, "src/ai.ts"),
        style: resolve(__dirname, "src/styles/index.css"),
        "inline-style": resolve(__dirname, "src/styles/inline.css"),
      },
      name: "YanivEditor",
      formats: ["es", "cjs"],
      /**
       * CJS 产物必须用 `.cjs` 后缀。本包是 `"type": "module"`，Node 会把 `dist/*.js`
       * 一律当作 ESM 解析——里面的 `exports` / `require` 在 ESM 作用域下不存在，
       * `require("@yanivjs/yaniv-editor")` 会直接抛
       * `ReferenceError: exports is not defined in ES module scope`。
       * （Rollup 对共享 chunk 本来就自动用了 `.cjs`，只有入口被这里覆盖成了 `.js`。）
       */
      fileName: (format, entryName) => {
        if (entryName === "index") return format === "es" ? "index.esm.js" : "index.cjs";
        if (entryName === "inline") return format === "es" ? "inline.esm.js" : "inline.cjs";
        if (entryName === "ai") return format === "es" ? "ai.esm.js" : "ai.cjs";
        return `${entryName}.js`;
      },
    },
    /**
     * 压缩策略（以 Vite 6 实际行为为准，不要再加 `NODE_ENV` 条件分支）：
     *
     * - **CJS 产物**：由 terser 压缩。
     * - **ESM 产物**：Vite 的 `vite:terser` 插件对 `build.lib && format === "es"` 直接
     *   `return null`，**不做压缩**。这是有意设计——保留换行与 `/*#__PURE__*\/` 标注，
     *   让接入方的打包器能正确 tree-shake 并自行压缩。Vue / React / Tiptap /
     *   Ant Design Vue 等库同样以未压缩 ESM 发布，属于面向打包器的标准做法。
     *
     * 旧配置把压缩挂在 `NODE_ENV === "production"` 上，而 `prepublishOnly` 只跑
     * `pnpm build`（不带 NODE_ENV），导致连 CJS 也从未被压缩过。
     */
    minify: "terser",
    sourcemap: true,
    terserOptions: {
      compress: {
        // 保留 console.warn / console.error：库的运行时诊断信息对接入方排障有价值，
        // 旧配置的 `drop_console: true` 会把 session 重建失败等关键告警一并抹掉
        pure_funcs: ["console.log", "console.debug", "console.info"],
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
      /**
       * 不做属性名 mangle。Vue（`_ctx` / `__vccOpts` / `__name`）、Tiptap 扩展 options
       * 与 ProseMirror 插件状态都依赖下划线前缀属性跨包访问，重命名会在运行时断链。
       */
      mangle: true,
    },
    rollupOptions: {
      external: [
        "vue",
        "@tiptap/vue-3",
        "@tiptap/core",
        "@tiptap/pm",
        "@tiptap/starter-kit",
        /^@tiptap\/.*/,
        "linkifyjs",
        "ant-design-vue",
        "@ant-design/icons-vue",
        "docx",
        "file-saver",
        "katex",
        "mammoth",
        "lowlight",
        /^prosemirror-.*/,
      ],
      output: {
        /**
         * CJS 产物的默认导入互操作方式。
         *
         * Rollup 默认是 `"default"`——即假定 external 是纯 CJS、`module.exports` 本身就是
         * 默认导出，于是 `import X from "pkg"` 直接编译成 `const X = require("pkg")`。
         * 但 `@tiptap/*`、`ant-design-vue` 等依赖的 CJS 产物都带 `__esModule: true`，
         * 默认导出挂在 `.default` 上，于是 `X.configure(...)` 在 require 侧直接抛
         * `TypeError: X.configure is not a function`（ESM 侧完全正常，因此一直没被发现）。
         *
         * `"auto"` 即 Babel / TypeScript 的 `__esModule` 探测语义：带标记取 `.default`，
         * 不带则取 `module.exports`。本仓库全部 external 均符合该约定
         * （见 scripts/check-dist-entries.mjs 的加载自检）。
         */
        interop: "auto",
        globals: {
          vue: "Vue",
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "assets/[name]-[hash][extname]";
          return assetInfo.name || "asset";
        },
      },
    },
    cssCodeSplit: true,
  },
};

/**
 * ⚠⚠ **库构建绝不能把开发机的 `.env` 编译进产物。**
 *
 * `src/features/ai/envConfig.ts` 与 `client.ts` 读 `import.meta.env.VITE_AI_*`，
 * 而 vite 会在**构建期**把它们静态替换掉——值就此冻结在发布那一刻。后果实测过：
 * 已发布的 `0.3.0` 是在存在 `.env`（`VITE_AI_DEMO_MODE=true`）的机器上打的，
 * `isAiDemoMode()` 被常量折叠成 `true`，**所有接入方拿到的都是恒开的模拟 AI 流，
 * 运行时关不掉**；同时那个 tarball 也无法只从 git 复现（少了这个被 gitignore 的文件，
 * 237 个产物文件里 124 个对不上）。
 *
 * 所以 `command === "build"` 时把 `envPrefix` 换成一个永不匹配的前缀：
 * 任何 `VITE_*` 都不再被内联，`import.meta.env` 只剩 vite 内置的那几项。
 * **`serve`（`pnpm dev`）不受影响**，本地调试照旧能用 `.env` 打开 demo 模式。
 *
 * ⚠ 由此，配置分级里第 4 级「构建期 `VITE_AI_*`」对**已发布的 npm 包不再生效**
 * ——它本来也不生效（冻结的是发布者的值，不是接入方的），只是现在变成确定的不生效。
 * 接入方要用构建期变量，只能从源码接入（走他们自己的 vite 构建）。
 */
const NEVER_MATCHING_ENV_PREFIX = "YANIV_LIB_NO_ENV_INLINE_";

export default defineConfig(({ command }) =>
  command === "build" ? { ...libConfig, envPrefix: NEVER_MATCHING_ENV_PREFIX } : libConfig,
);
