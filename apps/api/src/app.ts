import { Hono } from "hono";
import type { Db } from "./db.ts";
import { species_en } from "./db/schema.ts";

/** The API as a runtime-neutral Hono app. Adapters such as server.ts serve it. */
export function createApp({ db }: { db: Db }) {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  app.get("/health", async (c) => {
    try {
      await db.select({ species_id: species_en.species_id }).from(species_en).limit(1);
    } catch (error) {
      console.error("health check failed:", error instanceof Error ? error.message : error);
      return c.json({ status: "unhealthy", database: "disconnected" }, 500);
    }
    return c.json({ status: "healthy", database: "connected" });
  });

  return app;
}
