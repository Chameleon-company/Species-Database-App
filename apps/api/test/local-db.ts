import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createDb } from "../src/db.ts";

const template = parseEnv(readFileSync(new URL("../../../.env.example", import.meta.url), "utf8"));

/** The local Supabase stack, from `SUPABASE_URL` and `SUPABASE_KEY` in the committed .env.example. */
export const LOCAL_SUPABASE_URL = template.SUPABASE_URL ?? "";
export const LOCAL_SUPABASE_KEY = template.SUPABASE_KEY ?? "";

export const createLocalDb = () => createDb(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);
