import { LOCAL_SUPABASE_KEY, LOCAL_SUPABASE_URL } from "./local-db.ts";

const START = "Run `pnpm supabase start` or `pnpm supabase:api`";

function describeStatus(status: number): string {
  if (status === 401)
    return "it answered 401. Check SUPABASE_KEY in .env.example against the local stack";
  if (status === 404) return "species_en is missing. Run `pnpm supabase db reset`";
  return `it answered ${status}. ${START}`;
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return `the request failed with "${String(error)}". ${START}`;
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : "";
  return `the request failed with "${error.message}${cause}". ${START}`;
}

/** Vitest global setup. Throws with the cause and the fix when the local stack cannot serve species_en within 5 seconds. */
export default async function requireLocalStack() {
  const problem = await fetch(
    `${LOCAL_SUPABASE_URL}/rest/v1/species_en?select=species_id&limit=1`,
    {
      headers: { apikey: LOCAL_SUPABASE_KEY },
      signal: AbortSignal.timeout(5000),
    },
  ).then((response) => (response.ok ? null : describeStatus(response.status)), describeError);
  if (problem) {
    throw new Error(
      `The API tests need the local Supabase stack at ${LOCAL_SUPABASE_URL}, but ${problem}.`,
    );
  }
}
