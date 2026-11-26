import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createDb } from "./db.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set. Copy .env.example to .env at the repository root.`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const app = createApp({ db: createDb(supabaseUrl, requireEnv("SUPABASE_KEY")) });
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, ({ port: listening }) => {
  console.log(`API on http://localhost:${listening}, Supabase at ${new URL(supabaseUrl).host}`);
});
