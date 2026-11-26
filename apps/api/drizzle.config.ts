import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "drizzle-kit";

const { DATABASE_URL } = parseEnv(
  readFileSync(new URL("../../.env.example", import.meta.url), "utf8"),
);

export default defineConfig({
  dialect: "postgresql",
  out: "./.drizzle-pull",
  dbCredentials: { url: DATABASE_URL ?? "" },
  schemaFilter: ["public"],
  introspect: { casing: "preserve" },
});
