import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import type { OutputAsset, OutputBundle, OutputChunk } from "rollup";
import type { Plugin } from "vite";

// Production build uses obfuscation
const isProduction = process.env.NODE_ENV === "production";

function getAssetSource(asset: OutputAsset): string {
  return typeof asset.source === "string"
    ? asset.source
    : Buffer.from(asset.source as Uint8Array).toString("utf-8");
}

function isInlineCssAsset(fileName: string): boolean {
  return (
    fileName === "inline.css" || fileName.includes("inline-style") || /\/inline[-.]/.test(fileName)
  );
}

function isStyleEntryCssAsset(fileName: string): boolean {
  return fileName === "style.css" || fileName.startsWith("assets/style-");
}

/**
 * lib 构建 CSS 收敛：
 * - 剔除 KaTeX（由接入方 import 'katex/dist/katex.min.css'）
 * - 将全部非 inline 的 CSS 合并为 dist/style.css
 * - 将 inline 相关 CSS 合并为 dist/inline.css
 * - 删除 assets/*.css 孤立文件
 */
function consolidateLibCssPlugin(): Plugin {
  return {
    name: "yaniv-consolidate-lib-css",
    generateBundle(_, bundle: OutputBundle) {
      const styleParts: string[] = [];
      const inlineParts: string[] = [];
      const deleteKeys: string[] = [];
      let styleAssetKey: string | null = null;
      let inlineAssetKey: string | null = null;

      for (const [key, item] of Object.entries(bundle)) {
        if (item.type === "chunk" && isCssOnlyEntryChunk(item)) {
          deleteKeys.push(key);
          continue;
        }

        if (item.type !== "asset" || !item.fileName.endsWith(".css")) continue;

        const asset = item as OutputAsset;
        const source = getAssetSource(asset);

        if (source.includes("font-family:KaTeX")) {
          deleteKeys.push(key);
          continue;
        }

        if (isInlineCssAsset(asset.fileName)) {
          if (asset.fileName === "inline.css") {
            inlineAssetKey = key;
            inlineParts.unshift(source);
          } else {
            inlineParts.push(source);
            deleteKeys.push(key);
          }
          continue;
        }

        if (isStyleEntryCssAsset(asset.fileName)) {
          if (asset.fileName === "style.css") {
            styleAssetKey = key;
            styleParts.unshift(source);
          } else {
            styleParts.push(source);
            deleteKeys.push(key);
          }
          continue;
        }

        styleParts.push(source);
        deleteKeys.push(key);
      }

      const mergedStyle = styleParts.join("\n");
      // Inline 入口复用 useEditorLocale 等共享组件：将全量组件样式一并打入 inline.css，保证仅引 inline.css 即可用
      const mergedInline = inlineParts.length
        ? `${inlineParts.join("\n")}\n${mergedStyle}`
        : mergedStyle;

      if (mergedStyle) {
        if (styleAssetKey && bundle[styleAssetKey]?.type === "asset") {
          (bundle[styleAssetKey] as OutputAsset).source = mergedStyle;
          (bundle[styleAssetKey] as OutputAsset).fileName = "style.css";
        } else {
          bundle["style.css"] = {
            type: "asset",
            fileName: "style.css",
            names: ["style.css"],
            source: mergedStyle,
            needsCodeReference: false,
          } as OutputAsset;
        }
      }

      if (mergedInline) {
        if (inlineAssetKey && bundle[inlineAssetKey]?.type === "asset") {
          (bundle[inlineAssetKey] as OutputAsset).source = mergedInline;
          (bundle[inlineAssetKey] as OutputAsset).fileName = "inline.css";
        } else {
          bundle["inline.css"] = {
            type: "asset",
            fileName: "inline.css",
            names: ["inline.css"],
            source: mergedInline,
            needsCodeReference: false,
          } as OutputAsset;
        }
      }

      for (const key of deleteKeys) {
        delete bundle[key];
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
        "linkifyjs",
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
