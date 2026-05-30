import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isReplit = !!process.env.REPL_ID;

export default defineConfig(async () => {
  const plugins: any[] = [react(), tailwindcss()];

  if (isReplit) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    const { devBanner } = await import("@replit/vite-plugin-dev-banner");
    const { runtimeErrorModal } = await import("@replit/vite-plugin-runtime-error-modal");
    plugins.push(cartographer(), devBanner(), runtimeErrorModal());
  }

  return {
    base: "/",
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(__dirname, "../../attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    build: {
      outDir: "dist/public",
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
