import type { Tables } from "./database.ts";

export type Species = Tables<"species_en">;

export type SpeciesTextField = Exclude<keyof Species, "species_id">;
