import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { resolve } from "path";

// Production build uses obfuscation
const isProduction = process.env.NODE_ENV === "production";

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
  ],
  resolve: {
    alias: {
      "@/editor": resolve(__dirname, "src/components/editor"),
      "@/base": resolve(__dirname, "src/components/base"),
      "@/tools": resolve(__dirname, "src/components/tools"),
      "@/ai": resolve(__dirname, "src/features/ai"),
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
        /^#\/.*/, // Internal APIs
        "lowlight",
        /^prosemirror-.*/,
      ],
      output: {
        globals: {
          vue: "Vue",
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "style.css";
          return assetInfo.name || "asset";
        },
      },
    },
    cssCodeSplit: false,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || "0.1.0"),
  },
});
