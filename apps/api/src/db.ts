import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema.ts";

const VERIFYING_MODES = ["verify-ca", "verify-full"];

/** Seconds that `close` waits for open queries before it ends the pool. */
export const POOL_CLOSE_SECONDS = 5;

/** True for loopback hosts (`localhost`, `127.0.0.0/8`, `[::1]`) and Unix-socket URLs. */
export function isLocalHost(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const socket = host.startsWith("%2f") || (url.searchParams.get("host") ?? "").startsWith("/");
  return socket || host === "localhost" || host === "[::1]" || /^127(\.\d{1,3}){3}$/.test(host);
}

/** True when TLS for this URL checks the server certificate. */
export const checksCertificate = (url: URL) =>
  VERIFYING_MODES.includes(url.searchParams.get("sslmode") ?? "");

/**
 * TLS for a database URL. A local host follows its `sslmode`, and has no TLS without one.
 * Every other host uses at least encrypted TLS (`require`). Only `verify-ca` and `verify-full`
 * in the URL replace it, because they also check the certificate.
 */
export function tlsFor(url: URL): { ssl?: false | "require" } {
  const mode = url.searchParams.get("sslmode");
  if (isLocalHost(url)) return mode ? {} : { ssl: false };
  return checksCertificate(url) ? {} : { ssl: "require" };
}

/**
 * A Drizzle client over a postgres.js pool of at most 5 connections, for the Supavisor session
 * pooler. Prepared statements are off. The database cancels a statement after 10 seconds. Idle
 * connections close after 20 seconds. `close` ends the pool within `POOL_CLOSE_SECONDS`.
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
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: POOL_CLOSE_SECONDS }),
  };
}

export type Db = ReturnType<typeof createDb>["db"];
