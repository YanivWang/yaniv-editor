import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

function getVendorChunkName(id: string) {
  const match = id.match(
    /\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)(?:\/(.*))?/,
  );
  if (!match) return "vendor";

  const [, packageName, rest = ""] = match;
  const segments = rest.split("/").filter(Boolean);

  if (packageName === "ant-design-vue") {
    return `vendor-antd-${segments[0] === "es" ? segments[1] || "core" : segments[0] || "core"}`;
  }

  if (packageName === "@ant-design/icons-vue") {
    return "vendor-antd-icons";
  }

  return `vendor-${packageName.replace("@", "").replace("/", "-")}`;
}

// Examples build configuration for Vercel/Netlify deployment
export default defineConfig({
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
  // Build examples app, not library
  build: {
    // Keep examples browser targets aligned with the library build and CSS nesting usage.
    target: ["es2022", "chrome105", "safari16", "firefox110", "edge105"],
    outDir: "dist",
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

          return getVendorChunkName(id);
        },
      },
    },
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify("0.1.0"),
  },
});
