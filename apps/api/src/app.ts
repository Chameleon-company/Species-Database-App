import { Hono } from "hono";
import type { Db } from "./db.ts";

/** The API as a runtime-neutral Hono app. Adapters such as server.ts serve it. */
export function createApp({ db }: { db: Db }) {
  const app = new Hono();

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  app.get("/health", async (c) => {
    const { error } = await db.from("species_en").select("species_id").limit(1).retry(false);
    if (error) {
      console.error("health check failed:", error.message);
      return c.json({ status: "unhealthy", database: "disconnected" }, 500);
    }
    return c.json({ status: "healthy", database: "connected" });
  });

  return app;
}
