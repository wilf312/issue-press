import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@kaze/ui/styles.css": resolve(__dirname, "node_modules/@kaze/ui/dist/ui.css"),
    },
  },
  server: {
    port: 8001,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
