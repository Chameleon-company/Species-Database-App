import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.ts";
import { createDb } from "../src/db.ts";
import { createLocalDb } from "./local-db.ts";

const app = createApp({ db: createLocalDb() });

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
    const offline = createApp({ db: createDb("http://127.0.0.1:9", "unused") });

    const res = await offline.request("/health");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ status: "unhealthy", database: "disconnected" });
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
