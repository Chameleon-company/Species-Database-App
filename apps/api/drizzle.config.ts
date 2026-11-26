import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "drizzle-kit";

const { DATABASE_URL } = parseEnv(
  readFileSync(new URL("../../.env.example", import.meta.url), "utf8"),
);

if (!DATABASE_URL) {
  throw new Error(
    ".env.example has no DATABASE_URL. pnpm gen:types reads the local database from it.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  out: "./.drizzle-pull",
  dbCredentials: { url: DATABASE_URL },
  schemaFilter: ["public"],
  introspect: { casing: "preserve" },
});
