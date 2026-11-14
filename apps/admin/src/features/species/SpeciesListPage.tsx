import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@sda/ui/components/button";
import { DataTable, DataTableText } from "@sda/ui/components/data-table";
import { dataTableColumnHelper } from "@sda/ui/lib/data-table";
import { ApiError } from "../../shared/api/apiClient";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import LoadError from "../../shared/ui/LoadError";
import Page from "../../shared/ui/Page";
import SearchField from "../../shared/ui/SearchField";
import { useTableText } from "../../shared/ui/useTableText";
import { useLanguage } from "../../useLanguage";
import { useDeleteSpecies, useSpeciesList } from "./api";
import type { SpeciesRecord } from "./species";

const column = dataTableColumnHelper<SpeciesRecord>();

const matches = (row: SpeciesRecord, query: string) =>
  [row.common_name, row.scientific_name, row.habitat].some((value) => value?.toLowerCase().includes(query));

export default function SpeciesListPage() {
  const { lang, t } = useLanguage();
  const { emptyLabel, labels } = useTableText();

  const species = useSpeciesList(lang);
  const deleteSpecies = useDeleteSpecies();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<SpeciesRecord | null>(null);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const all = species.data ?? [];
    return query ? all.filter((row) => matches(row, query)) : all;
  }, [species.data, search]);

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteSpecies.mutate(toDelete.species_id, {
      onSuccess: () => toast.success(t("speciesDeletedSuccessfully")),
      onError: (error) =>
        toast.error(error instanceof ApiError && error.message ? error.message : t("failedToDeleteSpecies")),
      onSettled: () => setToDelete(null),
    });
  };

  const columns = column.columns([
    column.accessor("species_id", { header: t("id"), meta: { className: "w-17" } }),
    column.accessor((row) => row.common_name ?? "", { id: "common_name", header: t("speciesName"), meta: { className: "min-w-40" } }),
    column.accessor((row) => row.scientific_name ?? "", {
      id: "scientific_name",
      header: t("scientificName"),
      cell: ({ getValue }) => <span className="text-body italic">{getValue()}</span>,
      meta: { className: "min-w-45" },
    }),
    column.accessor((row) => row.identification_character ?? "", {
      id: "identification_character",
      header: t("identificationCharacter"),
      cell: ({ getValue }) => <DataTableText className="max-w-80">{getValue()}</DataTableText>,
      meta: { className: "min-w-50 max-w-80" },
    }),
    column.accessor((row) => row.habitat ?? "", {
      id: "habitat",
      header: t("habitat"),
      cell: ({ getValue }) => <DataTableText className="max-w-80">{getValue()}</DataTableText>,
      meta: { className: "min-w-40 max-w-80" },
    }),
    column.display({
      id: "actions",
      header: t("actions"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button asChild variant="link" size="sm" className="h-auto px-1 text-primary">
            <Link to={`/species/${row.original.species_id}`}>{t("edit")}</Link>
          </Button>
          <Button
            variant="link"
            size="sm"
            className="h-auto px-1 text-destructive"
            onClick={() => setToDelete(row.original)}
          >
            {t("delete")}
          </Button>
        </div>
      ),
      meta: { className: "w-32" },
    }),
  ]);

  const databaseKey = lang === "tet" ? "tetumDatabase" : "englishDatabase";

  return (
    <Page
      title={t("species")}
      subtitle={t("speciesRecordCount", { count: species.data?.length ?? 0, database: t(databaseKey) })}
      actions={
        <>
          <Button asChild>
            <Link to="/species/new">
              <Plus />
              {t("addSpecies")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/species/import">
              <FileUp />
              {t("uploadExcel")}
            </Link>
          </Button>
        </>
      }
    >
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={`${t("search")} ${t("species")}, ${t("habitat")}...`}
      />
      {species.isError ? (
        <LoadError onRetry={() => species.refetch()}>{t("failedToLoadSpecies")}</LoadError>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => String(row.species_id)}
          loading={species.isPending}
          emptyLabel={emptyLabel}
          labels={labels}
          pageSizeOptions={[5, 10]}
        />
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={t("deleteSpeciesEntry")}
        confirmLabel={t("delete")}
        pending={deleteSpecies.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        {t("deleteConfirmPrefix")} <strong className="text-foreground">{toDelete?.common_name}</strong>?{" "}
        {t("deleteConfirmSuffix")}
      </ConfirmDialog>
    </Page>
  );
}
