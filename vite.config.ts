import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import devServer from "@hono/vite-dev-server";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    devServer({
      entry: "src/server/index.ts",
      exclude: [
        /^\/(?!api).*/, // Only handle routes starting with /api
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
