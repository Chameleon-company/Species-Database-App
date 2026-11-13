import type { DataTableLabels } from "@sda/ui/components/data-table";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";

/** DataTable texts for the current admin language. */
export function useTableText(): { emptyLabel: string; labels: Partial<DataTableLabels> } {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;

  return { emptyLabel: t("noRows"), labels: {} };
}
