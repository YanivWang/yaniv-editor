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

// Demo build configuration for Vercel/Netlify deployment
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@/editor": resolve(__dirname, "src/components/editor"),
      "@/base": resolve(__dirname, "src/components/base"),
      "@/tools": resolve(__dirname, "src/components/tools"),
      "@/ai": resolve(__dirname, "src/features/ai"),
      "@": resolve(__dirname, "src"),
    },
  },
  // Build demo app, not library
  build: {
    // Keep demo browser targets aligned with the library build and CSS nesting usage.
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
          if (id.includes("/yjs/") || id.includes("/y-websocket/") || id.includes("/lib0/")) {
            return "vendor-collaboration";
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
  // Copy static assets
  publicDir: "public",
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify("0.1.0"),
  },
});
