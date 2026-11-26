import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@sda/shared/database";

export type Db = SupabaseClient<Database>;

/** A server-side Supabase client. It keeps no auth session and starts no refresh timer. */
export const createDb = (url: string, key: string): Db =>
  createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
