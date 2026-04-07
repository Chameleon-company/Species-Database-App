import { useState } from "react";
import {
  Box,
  Typography,
  Button,
} from "@mui/material";
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
    <Box p={5}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        flexWrap="wrap"
        gap={2}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{ fontSize: { xs: "1.8rem", md: "2.5rem" } }}
        >
          {t.auditReport}
        </Typography>

        <Box display="flex" gap={1.5}>
    <button onClick={() => setLang("en")}>EN</button>
    <button onClick={() => setLang("tet")}>TET</button>
  </Box>
</Box>

      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <Button
        variant="contained"
        onClick={runAudit}
        disabled={!file || loading}
        sx={{ ml: 1.5 }}
      >
        {loading ? t.running : t.runAudit}
      </Button>

      {result?.status === "error" && (
        <Typography sx={{ mt: 2, color: "salmon" }}>
          {t.error}: {result.error}
        </Typography>
      )}

      {result?.status === "success" && result.report && (
        <Box mt={3}>
          <Typography variant="h6" mb={1}>
            {t.summary}
          </Typography>
          <ul>
            <li>{t.totalRows}: {result.report.rows}</li>
            <li>{t.emptyRows}: {result.report.empty_rows}</li>
            <li>{t.totalMissingValues}: {result.report.total_missing_values}</li>
            <li>{t.blockers}: {result.report.has_blockers ? t.yes : t.no}</li>
          </ul>

          <Typography variant="h6" mt={3} mb={1}>
            {t.missingValuesByColumn}
          </Typography>
          <ul>
            {Object.entries(result.report.missing_values_by_column)
              .filter(([, v]: any) => v > 0)
              .map(([col, count]: any) => (
                <li key={col}>
                  {col}: {count}
                </li>
              ))}
          </ul>

          <Typography variant="h6" mt={3} mb={1}>
            {t.duplicateScientificNames}
          </Typography>
          {result.report.duplicates_count > 0 ? (
            <ul>
              {result.report.duplicate_scientific_names.map((n: string) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : (
            <Typography>{t.noDuplicateScientificNames}</Typography>
          )}

          <Typography variant="h6" mt={3} mb={1}>
            {t.invalidLeafTypes}
          </Typography>
          {result.report.leaf_type_invalid_values.length > 0 ? (
            <ul>
              {result.report.leaf_type_invalid_values.map((v: string) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <Typography>{t.noInvalidLeafType}</Typography>
          )}

          <Typography variant="h6" mt={3} mb={1}>
            {t.invalidFruitTypes}
          </Typography>
          {result.report.fruit_type_invalid_values.length > 0 ? (
            <ul>
              {result.report.fruit_type_invalid_values.map((v: string) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <Typography>{t.noInvalidFruitType}</Typography>
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
        </Box>
      )}
    </Box>
  );
}