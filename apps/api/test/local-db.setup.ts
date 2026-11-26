import { LOCAL_SUPABASE_KEY, LOCAL_SUPABASE_URL } from "./local-db.ts";

const START = "Run `pnpm supabase start` or `pnpm supabase:api`";

async function describeResponse(response: Response): Promise<string> {
  if (response.status === 401) {
    return "it answered 401. Check SUPABASE_KEY in .env.example against the local stack";
  }
  const body = await response.text();
  if (body.includes("PGRST205")) return "species_en is missing. Run `pnpm supabase db reset`";
  return `it answered ${response.status} at ${response.url}. ${START}`;
}

function causeText(cause: unknown): string {
  if (cause instanceof AggregateError) return causeText(cause.errors[0]);
  if (!(cause instanceof Error)) return "";
  return cause.message || ("code" in cause ? String(cause.code) : "");
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? causeText(error.cause) : "";
  return `the request failed with "${message}${cause ? ` (${cause})` : ""}". ${START}`;
}

/** Vitest global setup. Throws with the cause and the fix when the local stack cannot serve species_en within 5 seconds. */
export default async function requireLocalStack() {
  const problem = await fetch(
    `${LOCAL_SUPABASE_URL}/rest/v1/species_en?select=species_id&limit=1`,
    {
      headers: { apikey: LOCAL_SUPABASE_KEY },
      signal: AbortSignal.timeout(5000),
    },
  ).then((response) => (response.ok ? null : describeResponse(response)), describeError);
  if (problem) {
    throw new Error(
      `The API tests need the local Supabase stack at ${LOCAL_SUPABASE_URL}, but ${problem}.`,
    );
  }
}
