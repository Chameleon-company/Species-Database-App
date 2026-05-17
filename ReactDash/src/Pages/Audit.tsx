import { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";
import LanguageToggle from "../Components/LanguageToggle";
import { useLanguage } from "../LanguageContext";


type AuditApiResponse = {
  status: "success" | "error";
  report?: any;
  error?: string;
};

export default function Audit() {
  const { lang, setLang } = useLanguage();

  const t = (key: string) => (translations as any)[key]?.[lang] || key;

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
      setResult({ status: "error", error: e?.message ?? t("unknownError") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        p: "28px 36px",
        backgroundColor: "#f7fbf2",
        fontFamily: "'DM Sans', sans-serif",
        minHeight: "100vh",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 4,
              background: "linear-gradient(90deg,#2d6a0a,#86b85a)",
              mb: 1,
            }}
          />
  
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ color: "#1a2e10", fontSize: { xs: "1.8rem", md: "2.5rem" } }}
          >
            {t("auditReport")}
          </Typography>
        </Box>
  
      </Box>
  
      <Box
        sx={{
          backgroundColor: "#ffffff",
          border: "1px solid #d8edbd",
          borderRadius: 3,
          p: 3,
          boxShadow: "0 2px 12px rgba(45,106,10,0.07)",
          mb: 3,
        }}
      >
        <Box
  display="flex"
  alignItems="center"
  gap={2}
  flexWrap="wrap"
>
  <Typography sx={{ color: "#4b5563", fontSize: 14 }}>
    {file ? file.name : "No file selected"}
  </Typography>

  <Button
    variant="contained"
    component="label"
    sx={{
      backgroundColor: "#2d6a0a",
      borderRadius: 2,
      fontWeight: 600,
      "&:hover": {
        backgroundColor: "#245508",
      },
    }}
  >
    {loading ? t("running") : t("runAudit")}

    <input
      hidden
      type="file"
      accept=".xlsx,.csv"
      onChange={(e) => {
        const selected = e.target.files?.[0] ?? null;
        setFile(selected);

        if (selected) {
          setTimeout(() => {
            runAudit();
          }, 100);
        }
      }}
    />
  </Button>
</Box>
  
        {result?.status === "error" && (
          <Typography sx={{ mt: 2, color: "#b91c1c", fontWeight: 500 }}>
            {t("error")}: {result.error}
          </Typography>
        )}
      </Box>
  
      {result?.status === "success" && result.report && (
        <Box
          sx={{
            backgroundColor: "#ffffff",
            border: "1px solid #d8edbd",
            borderRadius: 3,
            p: 3,
            boxShadow: "0 2px 12px rgba(45,106,10,0.07)",
          }}
        >
          <Typography variant="h6" mb={1} sx={{ color: "#1a2e10", fontWeight: 700 }}>
            {t("summary")}
          </Typography>
  
          <ul>
            <li>{t("totalRows")}: {result.report.rows}</li>
            <li>{t("emptyRows")}: {result.report.empty_rows}</li>
            <li>{t("totalMissingValues")}: {result.report.total_missing_values}</li>
            <li>{t("blockers")}: {result.report.has_blockers ? t("yes") : t("no")}</li>
          </ul>
  
          <Typography variant="h6" mt={3} mb={1} sx={{ color: "#1a2e10", fontWeight: 700 }}>
            {t("missingValuesByColumn")}
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
  
          <Typography variant="h6" mt={3} mb={1} sx={{ color: "#1a2e10", fontWeight: 700 }}>
            {t("duplicateScientificNames")}
          </Typography>
  
          {result.report.duplicates_count > 0 ? (
            <ul>
              {result.report.duplicate_scientific_names.map((n: string) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : (
            <Typography>{t("noDuplicateScientificNames")}</Typography>
          )}
  
          <Typography variant="h6" mt={3} mb={1} sx={{ color: "#1a2e10", fontWeight: 700 }}>
            {t("invalidLeafTypes")}
          </Typography>
  
          {result.report.leaf_type_invalid_values.length > 0 ? (
            <ul>
              {result.report.leaf_type_invalid_values.map((v: string) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <Typography>{t("noInvalidLeafType")}</Typography>
          )}
  
          <Typography variant="h6" mt={3} mb={1} sx={{ color: "#1a2e10", fontWeight: 700 }}>
            {t("invalidFruitTypes")}
          </Typography>
  
          {result.report.fruit_type_invalid_values.length > 0 ? (
            <ul>
              {result.report.fruit_type_invalid_values.map((v: string) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          ) : (
            <Typography>{t("noInvalidFruitType")}</Typography>
          )}
  
          <details style={{ marginTop: 16 }}>
            <summary>{t("showRawJson")}</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#111",
                color: "#ffffff",
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