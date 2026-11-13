export type SpeciesFieldName =
  | "scientific_name"
  | "common_name"
  | "leaf_type"
  | "fruit_type"
  | "definition"
  | "etymology"
  | "habitat"
  | "identification_character"
  | "phenology"
  | "seed_germination"
  | "pest";

export type SpeciesField = {
  name: SpeciesFieldName;
  labelKey: string;
  requiredKey?: string;
  rows?: number;
};

/** Every species text field, in form order. Fields with `requiredKey` are required in both languages. */
export const SPECIES_FIELDS: readonly SpeciesField[] = [
  { name: "scientific_name", labelKey: "scientificName", requiredKey: "scientificNameEmpty" },
  { name: "common_name", labelKey: "commonName", requiredKey: "commonNameEmpty" },
  { name: "leaf_type", labelKey: "leafType", requiredKey: "leafTypeEmpty" },
  { name: "fruit_type", labelKey: "fruitType", requiredKey: "fruitTypeEmpty" },
  { name: "definition", labelKey: "definition", rows: 3 },
  { name: "etymology", labelKey: "etymology", rows: 4 },
  { name: "habitat", labelKey: "habitat", rows: 4 },
  { name: "identification_character", labelKey: "identificationCharacter", rows: 4 },
  { name: "phenology", labelKey: "phenology", rows: 4 },
  { name: "seed_germination", labelKey: "seedGermination", rows: 4 },
  { name: "pest", labelKey: "pest", rows: 4 },
];

export const MAX_LENGTH = { en: 2000, tet: 2200 } as const;

export type SpeciesText = Record<SpeciesFieldName, string>;

export type SpeciesRecord = { species_id: number } & Partial<Record<SpeciesFieldName, string | null>>;

/**
 * Form state for one species. `tet.scientific_name` is unused: the Tetum
 * record always takes the English scientific name.
 */
export type SpeciesFormValues = { en: SpeciesText; tet: SpeciesText };

export function toSpeciesText(record?: SpeciesRecord): SpeciesText {
  return Object.fromEntries(
    SPECIES_FIELDS.map(({ name }) => [name, record?.[name] ?? ""])
  ) as SpeciesText;
}

export const emptySpeciesForm = (): SpeciesFormValues => ({
  en: toSpeciesText(),
  tet: toSpeciesText(),
});

/** Request body for create and update: English fields as named, Tetum fields with a `_tetum` suffix. */
export function toSpeciesPayload({ en, tet }: SpeciesFormValues): Record<string, string> {
  const tetum = Object.fromEntries(SPECIES_FIELDS.map(({ name }) => [`${name}_tetum`, tet[name]]));
  return { ...en, ...tetum, scientific_name_tetum: en.scientific_name };
}

/** Fields sent to `/translate`, in the order the API returns them. `definition` is not translated. */
const TRANSLATED_FIELDS: readonly SpeciesFieldName[] = [
  "scientific_name",
  "common_name",
  "leaf_type",
  "fruit_type",
  "etymology",
  "habitat",
  "identification_character",
  "phenology",
  "seed_germination",
  "pest",
];

const EMPTY_MARKER = "-";

/** `/translate` input: one string per translated field, with "-" standing in for an empty value. */
export const toTranslationInput = (en: SpeciesText): string[] =>
  TRANSLATED_FIELDS.map((name) => en[name] || EMPTY_MARKER);

/** Maps the `/translate` output back to Tetum fields, without the scientific name. */
export function fromTranslationOutput(output: string[]): Partial<SpeciesText> {
  return Object.fromEntries(
    TRANSLATED_FIELDS.map((name, index) => [name, output[index] === EMPTY_MARKER ? "" : output[index] ?? ""]).filter(
      ([name]) => name !== "scientific_name"
    )
  );
}
