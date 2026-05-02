import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  build: {
    modulePreload: {
      resolveDependencies: (filename, deps, context) => {
        // Keep markdown as true on-demand: do not preload it from App-level dynamic imports.
        if (
          context.hostType === "js" &&
          (filename.startsWith("assets/App-") || context.hostId.includes("/src/App.tsx"))
        ) {
          return deps.filter((dep) => !dep.includes("markdown-"));
        }
        return deps;
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("/node_modules/")) return;

          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-router-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react";
          }

          if (id.includes("/node_modules/@tauri-apps/")) return "tauri";
          if (id.includes("/node_modules/framer-motion/")) return "motion";

          if (
            id.includes("/node_modules/d3-force/") ||
            id.includes("/node_modules/react-force-graph-2d/")
          ) {
            return "graph";
          }

          if (
            id.includes("/node_modules/react-markdown/") ||
            id.includes("/node_modules/remark-gfm/")
          ) {
            return "markdown";
          }

          if (
            id.includes("/node_modules/i18next/") ||
            id.includes("/node_modules/react-i18next/")
          ) {
            return "i18n";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Tauri 在 `cargo build` 期间会往 src-tauri/target/doc 下生成几十万个
    // rustdoc HTML 文件。如果 Vite 监听它们，会导致无限 HMR reload，前端
    // 永远来不及挂载，Tauri 窗口就会一直停留在默认的透明背景上。
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
