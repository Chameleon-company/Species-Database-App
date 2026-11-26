import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema.ts";

const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

/**
 * A Drizzle client over a postgres.js pool of at most 5 connections, for the Supavisor session
 * pooler. Prepared statements are off, so it also works on the transaction pooler. An `sslmode`
 * in the URL decides TLS. Without one, local hosts use no TLS and every other host uses encrypted
 * TLS with no certificate check. The database cancels any statement after 10 seconds, and idle
 * connections close after 20 seconds. `close` ends the pool within 5 seconds, because an open pool
 * keeps the process alive.
 */
export function createDb(url: string) {
  const parsed = new URL(url);
  const ssl = parsed.searchParams.has("sslmode")
    ? {}
    : { ssl: LOCAL_HOSTS.includes(parsed.hostname) ? false : ("require" as const) };
  const client = postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { statement_timeout: 10_000 },
    ...ssl,
  });
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 5 }) };
}

export type Db = ReturnType<typeof createDb>["db"];
