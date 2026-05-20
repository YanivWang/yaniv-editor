import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import type { OutputAsset, OutputBundle, OutputChunk } from "rollup";
import type { Plugin } from "vite";

// Production build uses obfuscation
const isProduction = process.env.NODE_ENV === "production";

/** 将公开 CSS 入口稳定输出为 style.css / inline.css，KaTeX 样式保留在 math 异步 chunk。 */
function publicCssAssetPlugin(): Plugin {
  return {
    name: "yaniv-public-css-asset",
    generateBundle(_, bundle: OutputBundle) {
      for (const [key, asset] of Object.entries(bundle)) {
        if (asset.type === "chunk" && isCssOnlyEntryChunk(asset)) {
          delete bundle[key];
          continue;
        }

        if (asset.type !== "asset" || !asset.fileName.endsWith(".css")) continue;

        const source = typeof (asset as OutputAsset).source === "string" ? asset.source : "";
        if (source.includes("font-family:KaTeX")) continue;

        if (asset.fileName.startsWith("assets/style-")) {
          asset.fileName = "style.css";
        }

        if (asset.fileName.startsWith("assets/inline-style-")) {
          asset.fileName = "inline.css";
        }
      }
    },
  };
}

function isCssOnlyEntryChunk(chunk: OutputChunk) {
  if (!chunk.isEntry) return false;
  if (chunk.name !== "style" && chunk.name !== "inline-style") return false;
  return chunk.code.trim() === "";
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
      beforeWriteFile: (filePath, content) => {
        // Filter out problematic type references
        return { filePath, content };
      },
    }),
    publicCssAssetPlugin(),
    removeCssEntryDeclarationsPlugin(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@yanivjs/yaniv-editor/style.css": resolve(__dirname, "src/styles/index.css"),
      "@yanivjs/yaniv-editor/inline.css": resolve(__dirname, "src/styles/inline.css"),
      "@yanivjs/yaniv-editor/inline": resolve(__dirname, "src/inline.ts"),
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
        style: resolve(__dirname, "src/styles/index.css"),
        "inline-style": resolve(__dirname, "src/styles/inline.css"),
      },
      name: "YanivEditor",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        if (entryName === "index") return format === "es" ? "index.esm.js" : "index.js";
        if (entryName === "inline") return format === "es" ? "inline.esm.js" : "inline.js";
        return `${entryName}.js`;
      },
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
