import { createDb } from "./db.ts";

/**
 * The local Supabase stack from `pnpm supabase start`. The key is the CLI's fixed default
 * secret, the same value as `SUPABASE_KEY` in .env.example, and works on no hosted project.
 */
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
export const LOCAL_SUPABASE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

export const createLocalDb = () => createDb(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY);
