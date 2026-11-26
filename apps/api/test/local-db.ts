import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createDb, isLocalHost } from "../src/db.ts";

const template = parseEnv(readFileSync(new URL("../../../.env.example", import.meta.url), "utf8"));

/** The local database, from `DATABASE_URL` in the committed .env.example. */
export const LOCAL_DATABASE_URL = template.DATABASE_URL ?? "";

if (!LOCAL_DATABASE_URL) {
  throw new Error(
    ".env.example has no DATABASE_URL. The API tests read the local database from it.",
  );
}
if (!isLocalHost(new URL(LOCAL_DATABASE_URL))) {
  throw new Error(
    `.env.example points DATABASE_URL at ${new URL(LOCAL_DATABASE_URL).host}. The API tests run only on a local database.`,
  );
}

export const createLocalDb = () => createDb(LOCAL_DATABASE_URL);
