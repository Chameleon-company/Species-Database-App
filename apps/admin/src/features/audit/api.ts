import { useMutation } from "@tanstack/react-query";
import { requestJson, rootUrl } from "../../shared/api/apiClient";

export type AuditReport = {
  rows: number;
  empty_rows: number;
  total_missing_values: number;
  has_blockers: boolean;
  missing_values_by_column: Record<string, number>;
  duplicates_count: number;
  duplicate_scientific_names: string[];
  leaf_type_invalid_values: string[];
  fruit_type_invalid_values: string[];
};

/** Validates a spreadsheet without importing it. Changes no server state. */
export const useAuditSpreadsheet = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (await requestJson<{ report: AuditReport }>(rootUrl("/audit-species"), { method: "POST", form })).report;
    },
  });
