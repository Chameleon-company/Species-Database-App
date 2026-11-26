import type { Tables } from "./database.ts";

export type Species = Tables<"species_en">;

/** Every `Species` column whose value is text. */
export type SpeciesTextField = {
  [K in keyof Species]: Species[K] extends string | null ? K : never;
}[keyof Species];
