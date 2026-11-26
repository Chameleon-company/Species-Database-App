import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createDb } from "../src/db.ts";

const template = parseEnv(readFileSync(new URL("../../../.env.example", import.meta.url), "utf8"));

function readLocal(name: "SUPABASE_URL" | "SUPABASE_KEY"): string {
  const value = template[name];
  if (!value)
    throw new Error(`.env.example has no ${name}. The API tests read the local stack from it.`);
  return value;
}

/** The local Supabase stack, from `SUPABASE_URL` and `SUPABASE_KEY` in the committed .env.example. */
export const LOCAL_SUPABASE_URL = readLocal("SUPABASE_URL");
export const LOCAL_SUPABASE_KEY = readLocal("SUPABASE_KEY");

if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(LOCAL_SUPABASE_URL).hostname)) {
  throw new Error(
    `.env.example points SUPABASE_URL at ${LOCAL_SUPABASE_URL}. The API tests run only on a local stack.`,
  );
}

export const createLocalDb = () => createDb(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);
