import { useRef, useState, type ReactNode } from "react";
import { Button } from "@sda/ui/components/button";
import { Card, CardContent } from "@sda/ui/components/card";
import { Spinner } from "@sda/ui/components/spinner";
import Page from "../../shared/ui/Page";
import { SPECIES_FIELDS } from "../species/species";
import { useLanguage } from "../../useLanguage";
import { useAuditSpreadsheet } from "./api";

/** The audit API names this column in the plural. Every other audit column matches a species field name. */
const AUDIT_COLUMN_ALIASES: Record<string, string> = { identification_characters: "identification_character" };

const auditColumnLabelKey = (column: string) =>
  SPECIES_FIELDS.find(({ name }) => name === (AUDIT_COLUMN_ALIASES[column] ?? column))?.labelKey;

function Section({ title, items, empty }: { title: string; items: ReactNode[]; empty?: string }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2 text-lg font-bold">{title}</h2>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-6 text-sm">{items}</ul>
      ) : (
        <p className="text-sm">{empty}</p>
      )}
    </section>
  );
}

export default function AuditPage() {
  const { t } = useLanguage();
  const audit = useAuditSpreadsheet();
  const columnLabel = (column: string) => {
    const labelKey = auditColumnLabelKey(column);
    return labelKey ? t(labelKey) : column;
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const report = audit.data;

  return (
    <Page title={t("auditReport")}>
      <Card className="gap-0 rounded-xl py-0 shadow-card">
        <CardContent className="flex flex-col gap-4 px-6 py-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-body">{fileName ?? t("noFileSelected")}</span>
            <Button onClick={() => inputRef.current?.click()} disabled={audit.isPending}>
              {audit.isPending && <Spinner aria-label={t("loading")} />}
              {audit.isPending ? t("running") : t("runAudit")}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setFileName(file.name);
                audit.mutate(file);
              }}
            />
          </div>
          {audit.isError && (
            <p className="text-sm font-medium text-destructive">
              {t("error")}: {audit.error.message || t("unknownError")}
            </p>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card className="gap-0 rounded-xl py-0 shadow-card">
          <CardContent className="px-6 py-6">
            <Section
              title={t("summary")}
              items={[
                <li key="rows">{t("totalRows")}: {report.rows}</li>,
                <li key="empty">{t("emptyRows")}: {report.empty_rows}</li>,
                <li key="missing">{t("totalMissingValues")}: {report.total_missing_values}</li>,
                <li key="blockers">{t("blockers")}: {report.has_blockers ? t("yes") : t("no")}</li>,
              ]}
            />
            {report.total_missing_values > 0 && (
              <Section
                title={t("missingValuesByColumn")}
                items={Object.entries(report.missing_values_by_column)
                  .filter(([, missing]) => missing > 0)
                  .map(([column, missing]) => (
                    <li key={column}>
                      {columnLabel(column)}: {missing}
                    </li>
                  ))}
              />
            )}
            <Section
              title={t("duplicateScientificNames")}
              items={report.duplicates_count > 0 ? report.duplicate_scientific_names.map((name) => <li key={name}>{name}</li>) : []}
              empty={t("noDuplicateScientificNames")}
            />
            <Section
              title={t("invalidLeafTypes")}
              items={report.leaf_type_invalid_values.map((value) => <li key={value}>{value}</li>)}
              empty={t("noInvalidLeafType")}
            />
            <Section
              title={t("invalidFruitTypes")}
              items={report.fruit_type_invalid_values.map((value) => <li key={value}>{value}</li>)}
              empty={t("noInvalidFruitType")}
            />
            <details className="mt-4">
              <summary className="cursor-pointer text-sm">{t("showRawJson")}</summary>
              <pre className="mt-2 rounded-lg bg-foreground p-3 text-label font-normal tracking-normal whitespace-pre-wrap text-card">
                {JSON.stringify(report, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </Page>
  );
}
