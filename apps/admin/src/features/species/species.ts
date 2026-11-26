import type { MessageKey } from "@sda/i18n/translate";
import type { Species, SpeciesTextField } from "@sda/shared/species";

export type SpeciesField = {
  name: SpeciesTextField;
  labelKey: MessageKey;
  maxLength: number;
  requiredKey?: MessageKey;
  rows?: number;
};

type SpeciesFieldConfig = Omit<SpeciesField, "name">;

const FIELD_CONFIG: Record<SpeciesTextField, SpeciesFieldConfig> = {
  scientific_name: { maxLength: 200, labelKey: "scientificName", requiredKey: "scientificNameEmpty" },
  common_name: { maxLength: 100, labelKey: "commonName", requiredKey: "commonNameEmpty" },
  leaf_type: { maxLength: 225, labelKey: "leafType", requiredKey: "leafTypeEmpty" },
  fruit_type: { maxLength: 225, labelKey: "fruitType", requiredKey: "fruitTypeEmpty" },
  definition: { maxLength: 2000, labelKey: "definition", rows: 3 },
  etymology: { maxLength: 1000, labelKey: "etymology", rows: 4 },
  habitat: { maxLength: 500, labelKey: "habitat", rows: 4 },
  identification_character: { maxLength: 2000, labelKey: "identificationCharacter", rows: 4 },
  phenology: { maxLength: 1000, labelKey: "phenology", rows: 4 },
  seed_germination: { maxLength: 2000, labelKey: "seedGermination", rows: 4 },
  pest: { maxLength: 2000, labelKey: "pest", rows: 4 },
};

/**
 * Every species text field, in form order. A text column missing from `FIELD_CONFIG` fails the
 * build. Fields with `requiredKey` are required in both languages. `maxLength` matches the column
 * size in services/flask-api/TableSchema.sql, which is the same for species_en and species_tet.
 */
export const SPECIES_FIELDS: readonly SpeciesField[] = (
  Object.keys(FIELD_CONFIG) as SpeciesTextField[]
).map((name) => ({ name, ...FIELD_CONFIG[name] }));

export type SpeciesText = Record<SpeciesTextField, string>;

/**
 * Form state for one species. `tet.scientific_name` is unused: the Tetum
 * record always takes the English scientific name.
 */
export type SpeciesFormValues = { en: SpeciesText; tet: SpeciesText };

export function toSpeciesText(record?: Species): SpeciesText {
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
const TRANSLATED_FIELDS: readonly SpeciesTextField[] = [
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
