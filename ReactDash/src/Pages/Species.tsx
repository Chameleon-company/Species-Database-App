// species pages
import type { GridColDef } from "@mui/x-data-grid";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import TableLayout from "../Components/TableLayout";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";

const apiUrl = import.meta.env.VITE_API_URL;

export default function SpeciesPage() {
  const [lang, setLang] = useState<"en" | "tet">("en");
  const t = translations[lang];

  type SpeciesRow = {
    id: number;
    species_id: number;
  };

  const [rows, setRows] = useState<SpeciesRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [, setDeleteLoading] = useState(false);
  const [, setError] = useState("");
  const [, setStatus] = useState("");

  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
      const res = await adminFetch(`${import.meta.env.VITE_API_URL}/species/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t.failedToDeleteSpecies);
      }

      setRows((prev) => prev.filter((row) => row.species_id !== deleteId));
      setStatus(t.speciesDeletedSuccessfully);
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
      const res = await adminFetch(`${apiUrl}/bundle`, {
        method: "GET",
      });

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

  useEffect(() => {
    fetchSpecies();
  }, []);

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: t.id,
    },
    { field: "common_name", headerName: t.speciesName, width: 170 },
    { field: "scientific_name", headerName: t.scientificName, width: 150 },
    {
      field: "identification_character",
      headerName: t.identificationCharacter,
      width: 150,
    },
    { field: "habitat", headerName: t.habitat, width: 130 },
    {
      field: "actions",
      headerName: t.actions,
      sortable: false,
      minWidth: 100,
      renderCell: (params) => {
        return (
          <div style={{ display: "flex", gap: 12 }}>
            <Link
              style={{
                color: "#4E8A16",
                cursor: "pointer",
              }}
              to={`/edit/${params.id}`}
            >
              {t.edit}
            </Link>
            <Link
              to="#"
              style={{
                color: "#4E8A16",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.preventDefault();
                setDeleteId(params.row.species_id);
                setDeleteName(params.row.common_name);
                setOpen(true);
              }}
            >
              {t.delete}
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4 items-center">
        <h2 className="text-3xl font-bold">{t.speciesPage}</h2>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setLang("en")} style={{ marginRight: "10px" }}>
            EN
          </button>
          <button onClick={() => setLang("tet")}>TET</button>

          <Button
            component={Link}
            to="/Page1"
            variant="contained"
            className="hover:!text-white hover:!shadow-lg hover:!bg-[#3b6910]"
            style={{
              backgroundColor: "#4E8A16",
              borderRadius: "8px",
              boxShadow: "none",
              textTransform: "none",
            }}
            startIcon={<AddIcon />}
          >
            {t.addSpecies}
          </Button>

          <Button
            component={Link}
            to="/AddExcel"
            variant="contained"
            className="hover:!text-white hover:!shadow-lg hover:!bg-[#3b6910]"
            style={{
              backgroundColor: "#4E8A16",
              borderRadius: "8px",
              boxShadow: "none",
              textTransform: "none",
            }}
            startIcon={<UploadFileIcon />}
          >
            {t.uploadExcel}
          </Button>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <TableLayout loading={loading} rows={rows} columns={columns} />
      </div>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {t.deleteSpeciesEntry}
        </DialogTitle>

        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t.deleteConfirmPrefix} <strong>{deleteName}</strong>? {t.deleteConfirmSuffix}
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>{t.cancel}</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            {t.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}