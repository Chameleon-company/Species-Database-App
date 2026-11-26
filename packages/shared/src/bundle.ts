import type { Tables } from "./database.ts";
import type { Media } from "./media.ts";
import type { Species } from "./species.ts";

/** `GET /api/bundle` body. `version` is the latest changelog version, or 1 when the changelog is empty. */
export type Bundle = {
  version: number;
  species_en: Species[];
  species_tet: Tables<"species_tet">[];
  media: Media[];
};
