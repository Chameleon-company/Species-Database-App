import { LOCAL_SUPABASE_KEY, LOCAL_SUPABASE_URL } from "./local-db.ts";

/** Vitest global setup. Throws when the local Supabase stack does not answer within 5 seconds. */
export default async function requireLocalStack() {
  const running = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: LOCAL_SUPABASE_KEY },
    signal: AbortSignal.timeout(5000),
  }).then(
    (response) => response.ok,
    () => false,
  );
  if (!running) {
    throw new Error(
      `The API tests need the local Supabase stack at ${LOCAL_SUPABASE_URL}. Run \`pnpm supabase:api\`, then run the tests again.`,
    );
  }
}
