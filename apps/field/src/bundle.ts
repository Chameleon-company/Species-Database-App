export type Species = {
  species_id: number;
  scientific_name: string;
  common_name: string;
};

export type Bundle = {
  version: number;
  species_en: Species[];
};

/**
 * GETs `${apiBase}/api/bundle`. Rejects when `apiBase` is empty, and with the HTTP status when
 * the response is not OK.
 */
export async function fetchBundle(
  apiBase: string | undefined,
  init?: RequestInit,
  fetchFn: typeof fetch = fetch,
): Promise<Bundle> {
  if (!apiBase) throw new Error("VITE_API_BASE is not set");
  const res = await fetchFn(`${apiBase.replace(/\/+$/, "")}/api/bundle`, init);
  if (!res.ok) throw new Error(`GET /api/bundle failed with ${res.status}`);
  return (await res.json()) as Bundle;
}

/** The English species with the lowest `species_id`, or `undefined` when there is none. */
export const firstSpecies = (bundle: Bundle): Species | undefined =>
  bundle.species_en.reduce<Species | undefined>(
    (first, species) => (first && first.species_id <= species.species_id ? first : species),
    undefined,
  );
