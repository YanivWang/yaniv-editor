import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

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
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
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
