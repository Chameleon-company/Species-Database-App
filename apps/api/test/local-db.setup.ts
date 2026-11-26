import postgres from "postgres";
import { LOCAL_DATABASE_URL } from "./local-db.ts";

const START = "Run `pnpm supabase start` or `pnpm supabase db start`";

function codeOf(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

function causeOf(error: unknown): string {
  if (error instanceof AggregateError) return causeOf(error.errors[0]);
  if (error instanceof Error) return error.message || codeOf(error);
  return String(error);
}

function describe(error: unknown): string {
  const code = codeOf(error);
  if (code === "42P01") return "species_en is missing. Run `pnpm supabase db reset`";
  if (code === "28P01") return "the password was refused. Check DATABASE_URL in .env.example";
  return `the connection failed with "${causeOf(error)}". ${START}`;
}

/** Vitest global setup. Throws with the cause and the fix when the local database cannot serve species_en. */
export default async function requireLocalDatabase() {
  const sql = postgres(LOCAL_DATABASE_URL, { prepare: false, connect_timeout: 5, max: 1 });
  const problem = await sql`select species_id from species_en limit 1`.then(() => null, describe);
  await sql.end();
  if (problem) {
    throw new Error(
      `The API tests need the local database at ${new URL(LOCAL_DATABASE_URL).host}, but ${problem}.`,
    );
  }
}
