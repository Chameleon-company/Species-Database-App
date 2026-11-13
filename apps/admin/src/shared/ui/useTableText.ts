import type { DataTableLabels } from "@sda/ui/components/data-table";
import { useLanguage } from "../../useLanguage";

/** DataTable texts for the current admin language. */
export function useTableText(): { emptyLabel: string; labels: Partial<DataTableLabels> } {
  const { t } = useLanguage();

  return {
    emptyLabel: t("noRows"),
    labels: {
      rowsPerPage: t("rowsPerPage"),
      range: (from, to, count) => t("paginationRange", { from, to, count }),
      previousPage: t("previousPage"),
      nextPage: t("nextPage"),
    },
  };
}
