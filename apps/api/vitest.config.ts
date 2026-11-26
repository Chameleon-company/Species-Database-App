import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { globalSetup: ["./test/local-db.setup.ts"] },
});
