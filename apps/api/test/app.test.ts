import { spawnSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.ts";
import { createDb } from "../src/db.ts";
import { species_en } from "../src/db/schema.ts";
import { LOCAL_DATABASE_URL, createLocalDb } from "./local-db.ts";

const local = createLocalDb();
const app = createApp({ db: local.db });

afterAll(() => local.close());

describe("GET /api/health", () => {
  it("returns ok without a database call", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /health", () => {
  it("returns healthy when the database answers", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "healthy", database: "connected" });
  });

  it("returns 500 with no error detail when the database does not answer", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const offline = createDb("postgresql://postgres:postgres@%2Fnonexistent-socket-dir/postgres");

    const res = await createApp({ db: offline.db }).request("/health");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ status: "unhealthy", database: "disconnected" });
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
    await offline.close();
  });
});

describe("transactions", () => {
  it("roll back every write when one step fails", async () => {
    const marker = `rollback-test-${Date.now()}`;
    const write = local.db.transaction(async (tx) => {
      await tx.insert(species_en).values({
        scientific_name: marker,
        common_name: marker,
        leaf_type: "Simple",
        fruit_type: "Drupe",
      });
      throw new Error("second write failed");
    });

    await expect(write).rejects.toThrow("second write failed");
    const rows = await local.db
      .select()
      .from(species_en)
      .where(eq(species_en.scientific_name, marker));
    expect(rows).toEqual([]);
  });
});

describe("server.ts under plain Node", () => {
  it("resolves every import and checks PORT before it serves", () => {
    const run = spawnSync(process.execPath, ["src/server.ts"], {
      cwd: new URL("..", import.meta.url),
      env: { PATH: process.env.PATH, DATABASE_URL: LOCAL_DATABASE_URL, PORT: "not-a-port" },
      encoding: "utf8",
    });
    expect(run.stderr).toContain('PORT must be a whole number from 1 to 65535, not "not-a-port".');
    expect(run.status).toBe(1);
  });
});
