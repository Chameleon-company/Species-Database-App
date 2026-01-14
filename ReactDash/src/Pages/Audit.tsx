import { useState } from "react";

type AuditApiResponse = {
  status: "success" | "error";
  report?: any;
  error?: string;
};

export default function Audit() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AuditApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function runAudit() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://127.0.0.1:5000/audit-species", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as AuditApiResponse;
      setResult(data);
    } catch (e: any) {
      setResult({ status: "error", error: e?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Audit Report</h1>

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
        {loading ? "Running..." : "Run Audit"}
      </button>

      {/* Error */}
      {result?.status === "error" && (
        <p style={{ marginTop: 16, color: "salmon" }}>
          Error: {result.error}
        </p>
      )}

      {/* Success */}
      {result?.status === "success" && result.report && (
        <div style={{ marginTop: 24 }}>
          <h3>Summary</h3>
          <ul>
            <li>Total rows: {result.report.rows}</li>
            <li>Empty rows: {result.report.empty_rows}</li>
            <li>Total missing values: {result.report.total_missing_values}</li>
            <li>Blockers: {result.report.has_blockers ? "Yes" : "No"}</li>
          </ul>

          <h3>Missing values by column</h3>
          <ul>
            {Object.entries(result.report.missing_values_by_column)
              .filter(([, v]: any) => v > 0)
              .map(([col, count]: any) => (
                <li key={col}>
                  {col}: {count}
                </li>
              ))}
          </ul>

          <h3>Duplicate scientific names</h3>
          {result.report.duplicates_count > 0 ? (
            <ul>
              {result.report.duplicate_scientific_names.map((n: string) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : (
            <p>No duplicate scientific names</p>
          )}

          <h3>Invalid leaf types</h3>
          {result.report.leaf_type_invalid_values.length > 0 ? (
            <ul>
              {result.report.leaf_type_invalid_values.map((v: string) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <p>No invalid leaf type</p>
          )}

          <h3>Invalid fruit types</h3>
          {result.report.fruit_type_invalid_values.length > 0 ? (
            <ul>
              {result.report.fruit_type_invalid_values.map((v: string) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <p>No invalid fruit type</p>
          )}

          <details style={{ marginTop: 16 }}>
            <summary>Show raw JSON</summary>
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
