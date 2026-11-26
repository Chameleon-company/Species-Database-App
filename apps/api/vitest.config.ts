import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { globalSetup: ["./src/local-db.setup.ts"] },
});
