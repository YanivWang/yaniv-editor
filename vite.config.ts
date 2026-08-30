import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import type { OutputAsset, OutputBundle, OutputChunk } from "rollup";
import type { Plugin } from "vite";

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

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      outDir: "dist",
      rollupTypes: true, // Bundle all .d.ts into one file
      logLevel: "error",
      strictOutput: false,
      // Exclude files that use ant-design-vue Popover (causes vue-types path issues)
      exclude: [
        "src/features/ai/shared/CustomAiPopover.vue",
        "src/features/ai/shared/AiSuggestionPopover.vue",
      ],
    }),
    consolidateLibCssPlugin(),
    removeCssEntryDeclarationsPlugin(),
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
      fileName: (format, entryName) => {
        if (entryName === "index") return format === "es" ? "index.esm.js" : "index.js";
        if (entryName === "inline") return format === "es" ? "inline.esm.js" : "inline.js";
        if (entryName === "ai") return format === "es" ? "ai.esm.js" : "ai.js";
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
        /^#\/.*/, // Internal APIs
        "lowlight",
        /^prosemirror-.*/,
      ],
      output: {
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
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || "0.1.0"),
  },
});
