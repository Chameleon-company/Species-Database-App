import { Hono } from "hono";
import type { Db } from "./db.ts";
import { species_en } from "./db/schema.ts";

const HEALTH_TIMEOUT_MS = 3000;

function within<T>(ms: number, work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer in ${ms} ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** The API as a runtime-neutral Hono app. Adapters such as server.ts serve it. */
export function createApp({ db }: { db: Db }) {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  app.get("/health", async (c) => {
    try {
      await within(
        HEALTH_TIMEOUT_MS,
        db.select({ species_id: species_en.species_id }).from(species_en).limit(1).execute(),
      );
    } catch (error) {
      console.error("health check failed:", error instanceof Error ? error.message : error);
      return c.json({ status: "unhealthy", database: "disconnected" }, 500);
    }
    return c.json({ status: "healthy", database: "connected" });
  });

  return app;
}
