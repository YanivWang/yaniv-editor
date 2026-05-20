import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import type { OutputAsset, OutputBundle } from "rollup";
import type { Plugin } from "vite";

// Production build uses obfuscation
const isProduction = process.env.NODE_ENV === "production";

/** 将核心 CSS 稳定输出为 style.css，KaTeX 样式保留在 math 异步 chunk。 */
function coreCssAssetPlugin(): Plugin {
  return {
    name: "yaniv-core-css-asset",
    generateBundle(_, bundle: OutputBundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== "asset" || !asset.fileName.endsWith(".css")) continue;
        if (!asset.fileName.startsWith("assets/index-")) continue;

        const source = typeof (asset as OutputAsset).source === "string" ? asset.source : "";
        if (source.includes("font-family:KaTeX")) continue;

        asset.fileName = "style.css";
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
      beforeWriteFile: (filePath, content) => {
        // Filter out problematic type references
        return { filePath, content };
      },
    }),
    coreCssAssetPlugin(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 9527,
  },
  build: {
    // Modern browsers that support CSS nesting
    target: ["es2022", "chrome105", "safari16", "firefox110", "edge105"],
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "YanivEditor",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.esm.js" : "index.js"),
    },
    minify: isProduction ? "terser" : false,
    terserOptions: isProduction
      ? {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          mangle: {
            properties: {
              regex: /^_/, // Mangle private properties starting with _
            },
          },
        }
      : undefined,
    rollupOptions: {
      external: [
        "vue",
        "@tiptap/vue-3",
        "@tiptap/core",
        "@tiptap/pm",
        "@tiptap/starter-kit",
        /^@tiptap\/.*/,
        "ant-design-vue",
        "@ant-design/icons-vue",
        "docx",
        "file-saver",
        "hotkeys-js",
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
