import { LOCAL_SUPABASE_KEY, LOCAL_SUPABASE_URL } from "./local-db.ts";

/** Vitest global setup. Throws with the cause when the local Supabase stack does not answer within 5 seconds. */
export default async function requireLocalStack() {
  const problem = await fetch(
    `${LOCAL_SUPABASE_URL}/rest/v1/species_en?select=species_id&limit=1`,
    {
      headers: { apikey: LOCAL_SUPABASE_KEY },
      signal: AbortSignal.timeout(5000),
    },
  ).then(
    (response) => (response.ok ? null : `it answered ${response.status}`),
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  );
  if (problem) {
    throw new Error(
      `The API tests need the local Supabase stack at ${LOCAL_SUPABASE_URL}, but ${problem}. Run \`pnpm supabase start\`, then run the tests again.`,
    );
  }
}
