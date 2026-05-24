import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

const repoBase = "/yaniv-editor/";
const isPagesBuild = process.env.PAGES_BUILD === "1";

// Examples build configuration for GitHub Pages / static hosting
export default defineConfig({
  base: isPagesBuild ? `${repoBase}examples/` : "/",
  plugins: [vue()],
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
    target: ["es2022", "chrome105", "safari16", "firefox110", "edge105"],
    outDir: "dist-demo",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("/@tiptap/") || id.includes("/prosemirror-")) {
            return "vendor-editor";
          }
          if (id.includes("/katex/") || id.includes("/lowlight/")) {
            return "vendor-content";
          }
          if (id.includes("/vue/") || id.includes("/@vue/")) {
            return "vendor-vue";
          }
          // ant-design-vue submodules have circular deps; splitting them breaks runtime init.
          if (id.includes("/ant-design-vue/") || id.includes("/@ant-design/")) {
            return "vendor-antd";
          }

          return "vendor-misc";
        },
      },
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify("0.1.0"),
  },
});
