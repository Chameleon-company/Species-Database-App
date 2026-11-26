import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema.ts";

const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];
const VERIFYING_MODES = ["verify-ca", "verify-full"];

export const isLocalHost = (url: URL) => LOCAL_HOSTS.includes(url.hostname.toLowerCase());

/**
 * TLS for a database URL. A local host follows its `sslmode`, and has no TLS without one.
 * Every other host uses at least encrypted TLS (`require`). Only `verify-ca` and `verify-full`
 * in the URL replace it, because they also check the certificate.
 */
export function tlsFor(url: URL): { ssl?: false | "require" } {
  const mode = url.searchParams.get("sslmode");
  if (isLocalHost(url)) return mode ? {} : { ssl: false };
  return mode && VERIFYING_MODES.includes(mode) ? {} : { ssl: "require" };
}

/**
 * A Drizzle client over a postgres.js pool of at most 5 connections, for the Supavisor session
 * pooler. Prepared statements are off. The database cancels a statement after 10 seconds. Idle
 * connections close after 20 seconds. `close` ends the pool within 5 seconds.
 */
export function createDb(url: string) {
  const client = postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { statement_timeout: 10_000 },
    ...tlsFor(new URL(url)),
  });
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 5 }) };
}

export type Db = ReturnType<typeof createDb>["db"];
