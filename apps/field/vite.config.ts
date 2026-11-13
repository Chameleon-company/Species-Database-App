import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { firstLoadBudget } from "./first-load-budget.ts";

export default defineConfig({
  envDir: "../..",
  plugins: [preact(), firstLoadBudget({ maxGzipKiB: 50 })],
  build: {
    target: "chrome71",
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
});
