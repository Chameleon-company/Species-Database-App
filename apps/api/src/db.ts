import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema.ts";

/**
 * A Drizzle client over postgres.js. Prepared statements are off, so the same client works on the
 * Supavisor transaction pooler. `close` ends the pool, which otherwise keeps the process alive.
 */
export function createDb(url: string) {
  const client = postgres(url, { prepare: false, connect_timeout: 10 });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

export type Db = ReturnType<typeof createDb>["db"];
