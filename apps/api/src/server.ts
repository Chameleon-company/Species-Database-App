import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createDb } from "./db.ts";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function requireEnv(name: string): string {
  return (
    process.env[name] ||
    fail(`${name} is not set. Copy .env.example to .env at the repository root.`)
  );
}

function readPort(): number {
  const value = process.env.PORT || "3000";
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536
    ? port
    : fail(`PORT must be a whole number from 1 to 65535, not "${value}".`);
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const app = createApp({ db: createDb(supabaseUrl, requireEnv("SUPABASE_KEY")) });

const server = serve({ fetch: app.fetch, port: readPort() }, ({ port }) => {
  console.log(`API on http://localhost:${port}, Supabase at ${new URL(supabaseUrl).host}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
