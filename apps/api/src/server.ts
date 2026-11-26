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

const databaseUrl = requireEnv("DATABASE_URL");
const { db, close } = createDb(databaseUrl);
const app = createApp({ db });

const hostname = process.env.HOST || "127.0.0.1";

const server = serve({ fetch: app.fetch, hostname, port: readPort() }, ({ address, port }) => {
  console.log(`API on http://${address}:${port}, database at ${new URL(databaseUrl).host}`);
});

let closing = false;

function shutdown() {
  if (closing) fail("Second stop signal. Exiting without waiting for open requests.");
  closing = true;
  server.close(() =>
    close().then(
      () => process.exit(0),
      (error: unknown) =>
        fail(
          `The database pool did not close: ${error instanceof Error ? error.message : String(error)}`,
        ),
    ),
  );
  setTimeout(() => fail("Open requests did not finish in 10 seconds. Exiting."), 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
