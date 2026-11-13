import { DataTable } from "@sda/ui/components/data-table";
import { dataTableColumnHelper } from "@sda/ui/lib/data-table";
import LoadError from "../../shared/ui/LoadError";
import { useTableText } from "../../shared/ui/useTableText";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useSpeciesList } from "./api";
import type { SpeciesFieldName, SpeciesRecord } from "./species";

const column = dataTableColumnHelper<SpeciesRecord>();

const TEXT_COLUMNS: { name: SpeciesFieldName; labelKey: string; className: string }[] = [
  { name: "scientific_name", labelKey: "scientificName", className: "min-w-50" },
  { name: "common_name", labelKey: "commonName", className: "min-w-37" },
  { name: "etymology", labelKey: "etymology", className: "min-w-37" },
  { name: "habitat", labelKey: "habitat", className: "min-w-32" },
  { name: "identification_character", labelKey: "identificationCharacter", className: "min-w-37" },
  { name: "leaf_type", labelKey: "leafType", className: "min-w-30" },
  { name: "fruit_type", labelKey: "fruitType", className: "min-w-30" },
  { name: "phenology", labelKey: "phenology", className: "min-w-30" },
  { name: "seed_germination", labelKey: "seedGermination", className: "min-w-37" },
  { name: "pest", labelKey: "pest", className: "min-w-32" },
];

/** Read-only table of every species field in the current admin language, sorted by ID. */
export default function SpeciesTable() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const { emptyLabel, labels } = useTableText();
  const species = useSpeciesList(lang);

  const columns = column.columns([
    column.accessor("species_id", { header: t("id"), meta: { className: "w-16" } }),
    ...TEXT_COLUMNS.map(({ name, labelKey, className }) =>
      column.accessor((row) => row[name] ?? "", {
        id: name,
        header: t(labelKey),
        cell: ({ getValue }) => (
          <span className={name === "scientific_name" ? "line-clamp-1 max-w-56 italic" : "line-clamp-1 max-w-56"}>
            {getValue()}
          </span>
        ),
        meta: { className },
      })
    ),
  ]);

  if (species.isError) {
    return <LoadError onRetry={() => species.refetch()}>{t("failedToLoadSpecies")}</LoadError>;
  }

  return (
    <DataTable
      columns={columns}
      data={species.data ?? []}
      getRowId={(row) => String(row.species_id)}
      loading={species.isPending}
      emptyLabel={emptyLabel}
      labels={labels}
      pageSizeOptions={[10, 20]}
      initialSorting={[{ id: "species_id", desc: false }]}
    />
  );
}
