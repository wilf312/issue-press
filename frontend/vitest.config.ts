import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@kaze/ui/styles.css": resolve(__dirname, "node_modules/@kaze/ui/dist/ui.css"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    css: false,
  },
});
