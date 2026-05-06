import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import TableLayout from "../Components/TableLayout";
import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";

const apiUrl = import.meta.env.VITE_API_URL;

/* ─── Types ───────────────────────────────────────────────────────── */
type SpeciesRow = {
  id: number;
  species_id: number;
  common_name?: string;
  scientific_name?: string;
  identification_character?: string;
  habitat?: string;
};

/* ─── Small reusable button ──────────────────────────────────────── */
function ActionButton({
  children,
  onClick,
  variant = "primary",
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "ghost";
  href?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 18px",
    borderRadius: 10,
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    textDecoration: "none",
    transition: "background 0.15s, box-shadow 0.15s, transform 0.1s",
    transform: hovered ? "translateY(-1px)" : "translateY(0)",
    whiteSpace: "nowrap",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: hovered ? "#245508" : "#2d6a0a",
      color: "#ffffff",
      boxShadow: hovered ? "0 4px 14px rgba(45,106,10,0.35)" : "0 2px 8px rgba(45,106,10,0.2)",
    },
    danger: {
      backgroundColor: hovered ? "#b91c1c" : "#dc2626",
      color: "#ffffff",
      boxShadow: hovered ? "0 4px 14px rgba(220,38,38,0.35)" : "none",
    },
    ghost: {
      backgroundColor: hovered ? "#f0f9e8" : "transparent",
      color: hovered ? "#2d6a0a" : "#4a8f1f",
      border: "1px solid #c2e29a",
      boxShadow: "none",
    },
  };

  const style = { ...base, ...variants[variant] };

  if (href) {
    return (
      <Link
        to={href}
        style={style}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

/* ─── Inline Edit / Delete cell links ───────────────────────────── */
function CellLink({
  children,
  onClick,
  color,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color,
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        textDecoration: hovered ? "underline" : "none",
        transition: "opacity 0.15s",
        opacity: hovered ? 0.8 : 1,
      }}
    >
      {children}
    </span>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function SpeciesPage() {
  const [rows, setRows] = useState<SpeciesRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<SpeciesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [, setDeleteLoading] = useState(false);
  const [, setError] = useState("");
  const [, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  /* search filter */
  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredRows(
      q
        ? rows.filter(
            (r) =>
              r.common_name?.toLowerCase().includes(q) ||
              r.scientific_name?.toLowerCase().includes(q) ||
              r.habitat?.toLowerCase().includes(q)
          )
        : rows
    );
  }, [search, rows]);

  const handleClose = () => {
    setOpen(false);
    setDeleteId(null);
    setDeleteName(null);
  };

  const handleConfirmDelete = async () => {
    setOpen(false);
    await handleSubmitDelete();
  };

  const handleSubmitDelete = async () => {
    setDeleteLoading(true);
    setStatus("");
    setError("");
    try {
      const res = await adminFetch(
        `${import.meta.env.VITE_API_URL}/species/${deleteId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("failedToDeleteSpecies"));
      }
      setRows((prev) => prev.filter((row) => row.species_id !== deleteId));
      setStatus(t("speciesDeletedSuccessfully"));
    } catch (error) {
      setError(`Error: ${(error as Error).message}`);
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
      setDeleteName(null);
    }
  };

  async function fetchSpecies() {
    setLoading(true);
    try {
      const res = await adminFetch(`${apiUrl}/bundle`, { method: "GET" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }
      const data = await res.json();
      const mainData = data.species_en.map((item: any) => ({
        id: item.species_id,
        ...item,
      }));
      setRows(mainData);
    } catch (e) {
      console.error("Failed to fetch species:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSpecies(); }, []);

  const [lang, setLang] = useState<"en" | "tet">(
    (localStorage.getItem("lang") as "en" | "tet") || "en"
  );
  const t = (key: string) =>
    translations[key as keyof typeof translations]?.[lang] || key;

  const columns: GridColDef[] = [
    { field: "id", headerName: t("id"), width: 70 },
    { field: "common_name", headerName: t("speciesName"), width: 160 },
    { field: "scientific_name", headerName: t("scientificName"), width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <span style={{ fontStyle: "italic", color: "#374151" }}>{params.value}</span>
      ),
    },
    { field: "identification_character", headerName: t("identificationCharacter"), width: 200 },
    { field: "habitat", headerName: t("habitat"), width: 160 },
    {
      field: "actions",
      headerName: t("actions"),
      sortable: false,
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <div style={{ display: "flex", alignItems: "center", gap: 14, height: "100%" }}>
          <Link to={`/edit/${params.id}`} style={{ textDecoration: "none" }}>
          <CellLink color="#2d6a0a">{t("edit")}</CellLink>
          </Link>
          <CellLink
            color="#dc2626"
            onClick={() => {
              setDeleteId(params.row.species_id);
              setDeleteName(params.row.common_name);
              setOpen(true);
            }}
          >
            {t("delete")}
          </CellLink>
        </div>
      ),
    },
  ];

  /* ── Stats ── */
  const totalSpecies = rows.length;

  return (
    <div style={{ padding: "28px 36px", minHeight: "100vh", backgroundColor: "#f7fbf2", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
  <div>
    <div style={{ width: 36, height: 4, borderRadius: 4, background: "linear-gradient(90deg, #2d6a0a, #86b85a)", marginBottom: 8 }} />
    <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1a2e10", margin: 0, letterSpacing: "-0.02em" }}>
      {t("species")}
    </h1>
    <p style={{ fontSize: 13, color: "#7a9464", marginTop: 4, fontWeight: 400 }}>
      {totalSpecies} {t("species")} records in the {t("englishDatabase")}
    </p>
  </div>

  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "#eef7e6",
        border: "1px solid #d0eab8",
        borderRadius: 10,
        padding: 4,
      }}
    >
      <button
        onClick={() => {
          localStorage.setItem("lang", "en");
          setLang("en");
        }}
        style={{
          padding: "8px 22px",
          border: "none",
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          transition: "all 0.18s",
          color: lang === "en" ? "#2d6a0a" : "#7a9464",
          background: lang === "en" ? "#ffffff" : "transparent",
          boxShadow: lang === "en" ? "0 1px 6px rgba(45,106,10,0.12)" : "none",
        }}
      >
        🌿 {t("english")}
      </button>

      <button
        onClick={() => {
          localStorage.setItem("lang", "tet");
          setLang("tet");
        }}
        style={{
          padding: "8px 22px",
          border: "none",
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
          transition: "all 0.18s",
          color: lang === "tet" ? "#2d6a0a" : "#7a9464",
          background: lang === "tet" ? "#ffffff" : "transparent",
          boxShadow: lang === "tet" ? "0 1px 6px rgba(45,106,10,0.12)" : "none",
        }}
      >
        🌏 {t("tetum")}
      </button>
    </div>

    <ActionButton href="/Page1" variant="primary">
      <AddIcon sx={{ fontSize: 17 }} />
      {t("addSpecies")}
    </ActionButton>

    <ActionButton href="/AddExcel" variant="ghost">
      <UploadFileIcon sx={{ fontSize: 17 }} />
      {t("uploadExcel")}
    </ActionButton>
  </div>
</div>
      

      {/* ── Search bar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#ffffff",
        border: "1px solid #d8edbd",
        borderRadius: 12,
        padding: "10px 16px",
        marginBottom: 16,
        maxWidth: 380,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <SearchIcon sx={{ fontSize: 18, color: "#86b85a" }} />
        <input
          type="text"
          placeholder={`${t("search")} ${t("species")}, ${t("habitat")}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            color: "#1a2e10",
            fontFamily: "inherit",
            width: "100%",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Table card ── */}
      <div style={{
        backgroundColor: "#ffffff",
        border: "1px solid #d8edbd",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(45,106,10,0.07)",
      }}>
        <TableLayout loading={loading} rows={filteredRows} columns={columns} />
      </div>

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          style: {
            borderRadius: 16,
            padding: "8px 4px",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            minWidth: 360,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 17, color: "#1a2e10", pb: 0.5 }}>
        {t("deleteSpeciesEntry")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14, color: "#4b5563" }}>
          {t("deleteConfirmPrefix")}{" "}
<strong style={{ color: "#1a2e10" }}>{deleteName}</strong>?{" "}
{t("deleteConfirmSuffix")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <button
            onClick={handleClose}
            style={{
              padding: "8px 20px",
              borderRadius: 9,
              border: "1px solid #d8edbd",
              background: "#ffffff",
              color: "#4b5563",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirmDelete}
            style={{
              padding: "8px 20px",
              borderRadius: 9,
              border: "none",
              background: "#dc2626",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(220,38,38,0.25)",
            }}
          >
           {t("delete")}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}