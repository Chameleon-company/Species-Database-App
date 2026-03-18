import { useState } from "react";
import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";

type AuditApiResponse = {
  status: "success" | "error";
  report?: any;
  error?: string;
};

export default function Audit() {
  const [lang, setLang] = useState<"en" | "tet">("en");
  const t = translations[lang];

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AuditApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_BASE;

  async function runAudit() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await adminFetch(`${API_URL}/audit-species`, {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as AuditApiResponse;
      setResult(data);
    } catch (e: any) {
      setResult({ status: "error", error: e?.message ?? t.unknownError });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{t.auditReport}</h1>
        <div>
          <button onClick={() => setLang("en")} style={{ marginRight: "10px" }}>
            EN
          </button>
          <button onClick={() => setLang("tet")}>
            TET
          </button>
        </div>
      </div>

      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={runAudit}
        disabled={!file || loading}
        style={{ marginLeft: 10 }}
      >
        {loading ? t.running : t.runAudit}
      </button>

      {result?.status === "error" && (
        <p style={{ marginTop: 16, color: "salmon" }}>
          {t.error}: {result.error}
        </p>
      )}

      {result?.status === "success" && result.report && (
        <div style={{ marginTop: 24 }}>
          <h3>{t.summary}</h3>
          <ul>
            <li>{t.totalRows}: {result.report.rows}</li>
            <li>{t.emptyRows}: {result.report.empty_rows}</li>
            <li>{t.totalMissingValues}: {result.report.total_missing_values}</li>
            <li>{t.blockers}: {result.report.has_blockers ? t.yes : t.no}</li>
          </ul>

          <h3>{t.missingValuesByColumn}</h3>
          <ul>
            {Object.entries(result.report.missing_values_by_column)
              .filter(([, v]: any) => v > 0)
              .map(([col, count]: any) => (
                <li key={col}>
                  {col}: {count}
                </li>
              ))}
          </ul>

          <h3>{t.duplicateScientificNames}</h3>
          {result.report.duplicates_count > 0 ? (
            <ul>
              {result.report.duplicate_scientific_names.map((n: string) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : (
            <p>{t.noDuplicateScientificNames}</p>
          )}

          <h3>{t.invalidLeafTypes}</h3>
          {result.report.leaf_type_invalid_values.length > 0 ? (
            <ul>
              {result.report.leaf_type_invalid_values.map((v: string) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <p>{t.noInvalidLeafType}</p>
          )}

          <h3>{t.invalidFruitTypes}</h3>
          {result.report.fruit_type_invalid_values.length > 0 ? (
            <ul>
              {result.report.fruit_type_invalid_values.map((v: string) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <p>{t.noInvalidFruitType}</p>
          )}

          <details style={{ marginTop: 16 }}>
            <summary>{t.showRawJson}</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#111",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {JSON.stringify(result.report, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}