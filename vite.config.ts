import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // prefix '' => also loads variables NOT starting with VITE_ (these stay on the server side, never sent to the browser)
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.GEO_API_URL || "http://127.0.0.1:5080";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        // Browser calls /geo/search/...  ->  Vite forwards to the Geo API and adds the key.
        "/geo": {
          target,
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/geo/, ""),
          headers: { "X-Api-Key": env.GEO_API_KEY ?? "" },
        },
      },
    },
    build: { outDir: "dist", sourcemap: true },
  };
});