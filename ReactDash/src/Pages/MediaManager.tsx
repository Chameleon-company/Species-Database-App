import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ImageIcon from "@mui/icons-material/Image";
import VideocamIcon from "@mui/icons-material/Videocam";
import SearchIcon from "@mui/icons-material/Search";
import { adminFetch } from "../utils/adminFetch";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

type Media = {
  media_id: number;
  species_name: string;
  media_type: string;
  download_link: string;
  alt_text?: string;
};

/* ─── Image thumbnail cell ──────────────────────────────────────── */
function ThumbCell({ url, type }: { url: string; type: string }) {
  const [err, setErr] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  if (!url) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#9ca3af",
          fontSize: 12,
        }}
      >
        <ImageIcon sx={{ fontSize: 16 }} /> No media
      </div>
    );
  }

  if (type === "video") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: "#1a2e10",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <VideocamIcon sx={{ color: "#86b85a", fontSize: 22 }} />
        </div>
        <span style={{ fontSize: 11, color: "#6b7280" }}>video</span>
      </div>
    );
  }

  if (err) {
    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          backgroundColor: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #d1d5db",
        }}
      >
        <ImageIcon sx={{ color: "#d1d5db", fontSize: 20 }} />
      </div>
    );
  }

  return (
    <>
      <img
        src={url}
        alt="media preview"
        onError={() => setErr(true)}
        onClick={() => setPreviewing(true)}
        style={{
          width: 48,
          height: 48,
          objectFit: "cover",
          borderRadius: 8,
          border: "1px solid #d8edbd",
          cursor: "zoom-in",
          transition: "transform 0.15s, box-shadow 0.15s",
          display: "block",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLImageElement).style.transform = "scale(1.08)";
          (e.currentTarget as HTMLImageElement).style.boxShadow =
            "0 4px 16px rgba(0,0,0,0.18)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLImageElement).style.boxShadow = "none";
        }}
      />
      {/* Lightbox */}
      {previewing && (
        <div
          onClick={() => setPreviewing(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img
            src={url}
            alt="preview"
            style={{
              maxWidth: "88vw",
              maxHeight: "88vh",
              borderRadius: 12,
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
          />
        </div>
      )}
    </>
  );
}

/* ─── Type badge ────────────────────────────────────────────────── */
function TypeBadge({ type }: { type: string }) {
  const isImage = type === "image";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        backgroundColor: isImage ? "#eef6e6" : "#eff6ff",
        color: isImage ? "#2d6a0a" : "#1d4ed8",
        border: `1px solid ${isImage ? "#c2e29a" : "#bfdbfe"}`,
      }}
    >
      {isImage ? (
        <ImageIcon sx={{ fontSize: 16 }} />
      ) : (
        <VideocamIcon sx={{ fontSize: 12 }} />
      )}
      {type || "—"}
    </span>
  );
}

/* ─── Delete confirm dialog ─────────────────────────────────────── */
function DeleteDialog({
  open,
  name,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [hoverCancel, setHoverCancel] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          borderRadius: 16,
          padding: "8px 4px",
          minWidth: 360,
          fontFamily: "inherit",
        },
      }}
    >
      <DialogTitle
        sx={{ fontWeight: 700, fontSize: 17, color: "#1a2e10", pb: 0.5 }}
      >
        Delete Media?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ fontSize: 14, color: "#4b5563" }}>
          Are you sure you want to delete the media for{" "}
          <strong style={{ color: "#1a2e10" }}>{name}</strong>? This cannot be
          undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <button
          onClick={onClose}
          onMouseEnter={() => setHoverCancel(true)}
          onMouseLeave={() => setHoverCancel(false)}
          style={{
            padding: "8px 20px",
            borderRadius: 9,
            border: "1px solid #d8edbd",
            background: hoverCancel ? "#f0f9e8" : "#ffffff",
            color: "#4b5563",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          onMouseEnter={() => setHoverDelete(true)}
          onMouseLeave={() => setHoverDelete(false)}
          style={{
            padding: "8px 20px",
            borderRadius: 9,
            border: "none",
            background: hoverDelete ? "#b91c1c" : "#dc2626",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(220,38,38,0.25)",
            transition: "background 0.15s",
          }}
        >
          Delete
        </button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Main component ────────────────────────────────────────────── */
export default function MediaManager() {
  const [media, setMedia] = useState<Media[]>([]);
  const [filtered, setFiltered] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addHovered, setAddHovered] = useState(false);

  // delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Media | null>(null);

  const API_URL = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    fetchMedia();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? media.filter(
            (m) =>
              m.species_name?.toLowerCase().includes(q) ||
              m.media_type?.toLowerCase().includes(q) ||
              m.alt_text?.toLowerCase().includes(q),
          )
        : media,
    );
  }, [search, media]);

  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`${API_URL}/upload-media`, {});
      if (!res.ok) throw new Error("Failed to load media");
      const data = await res.json();
      setMedia(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const addMedia = () => {
    setMedia((prev) => [
      {
        media_id: Date.now() * -1,
        species_name: "",
        media_type: "",
        download_link: "",
        alt_text: "",
      },
      ...prev,
    ]);
  };

  const saveMedia = async (row: Media) => {
    if (!row.species_name || !row.media_type || !row.download_link) {
      setError("Species name, type and URL are required");
      return row;
    }
    const isNew = row.media_id < 0;
    const url = isNew
      ? `${API_URL}/upload-media`
      : `${API_URL}/upload-media/${row.media_id}`;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(row),
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409)
          throw new Error("This media link is already registered");
        throw new Error(err.error || "Upload failed");
      }
      await fetchMedia();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    return row;
  };

  const handleDeleteClick = (row: Media) => setDeleteTarget(row);
  const handleDeleteClose = () => setDeleteTarget(null);
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteTarget(null);
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(
        `${API_URL}/upload-media/${deleteTarget.media_id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      await fetchMedia();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "preview",
      headerName: "Preview",
      width: 80,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          <ThumbCell
            url={params.row.download_link}
            type={params.row.media_type}
          />
        </div>
      ),
    },
    {
      field: "media_id",
      headerName: "ID",
      width: 70,
      valueGetter: (_value: any, row: Media) =>
        row.media_id < 0 ? "New" : row.media_id,
    },
    {
      field: "species_name",
      headerName: "Species Name",
      width: 200,
      editable: true,
      renderCell: (params: GridRenderCellParams) => (
        <span
          style={{ fontStyle: "italic", color: "#1a2e10", fontWeight: 500 }}
        >
          {params.value || (
            <span style={{ color: "#9ca3af", fontStyle: "normal" }}>
              Click to edit…
            </span>
          )}
        </span>
      ),
    },
    {
      field: "media_type",
      headerName: "Type",
      width: 120,
      editable: true,
      type: "singleSelect",
      valueOptions: ["image", "video"],
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <TypeBadge type={params.value} />
        ) : (
          <span style={{ color: "#9ca3af", fontSize: 12 }}>Select…</span>
        ),
    },
    {
      field: "download_link",
      headerName: "Media URL",
      flex: 1,
      minWidth: 260,
      editable: true,
      renderCell: (params: GridRenderCellParams) => (
        <span
          style={{
            fontSize: 12,
            color: "#4b5563",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
            display: "block",
          }}
        >
          {params.value || <span style={{ color: "#9ca3af" }}>Paste URL…</span>}
        </span>
      ),
    },
    {
      field: "alt_text",
      headerName: "Alt Text",
      width: 180,
      editable: true,
      renderCell: (params: GridRenderCellParams) => (
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {params.value || <span style={{ color: "#d1d5db" }}>—</span>}
        </span>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <DeleteBtn onClick={() => handleDeleteClick(params.row)} />
      ),
    },
  ];

  const imageCount = media.filter((m) => m.media_type === "image").length;
  const videoCount = media.filter((m) => m.media_type === "video").length;

  return (
    <div
      style={{
        padding: "28px 36px",

        backgroundColor: "#f7fbf2",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 4,
              background: "linear-gradient(90deg,#2d6a0a,#86b85a)",
              marginBottom: 8,
            }}
          />
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#1a2e10",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Media
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#7a9464",
              marginTop: 4,
              fontWeight: 400,
            }}
          >
            {media.length} items · {imageCount} images · {videoCount} videos
          </p>
        </div>

        <button
          onClick={addMedia}
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            borderRadius: 10,
            border: "none",
            backgroundColor: addHovered ? "#245508" : "#2d6a0a",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            boxShadow: addHovered
              ? "0 4px 14px rgba(45,106,10,0.35)"
              : "0 2px 8px rgba(45,106,10,0.2)",
            transform: addHovered ? "translateY(-1px)" : "translateY(0)",
            transition: "all 0.15s",
          }}
        >
          <AddIcon sx={{ fontSize: 17 }} />
          Add Media
        </button>
      </div>

      {/* ── Search ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          backgroundColor: "#ffffff",
          border: "1px solid #d8edbd",
          borderRadius: 12,
          padding: "10px 16px",
          marginBottom: 16,
          maxWidth: 360,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <SearchIcon sx={{ fontSize: 18, color: "#86b85a" }} />
        <input
          type="text"
          placeholder="Search species, type, alt text…"
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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            color: "#b91c1c",
            fontWeight: 500,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #d8edbd",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(45,106,10,0.07)",
        }}
      >
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row) => row.media_id}
          loading={loading}
          editMode="row"
          rowHeight={68}
          processRowUpdate={async (row) => {
            await saveMedia(row);
            return row;
          }}
          onProcessRowUpdateError={(err) => setError(err.message)}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            fontFamily: "'DM Sans', sans-serif",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#eef6e6",
              borderBottom: "1px solid #d8edbd",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#3d5a2a",
            },
            "& .MuiDataGrid-row:hover": { backgroundColor: "#f7fbf2" },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #f0f9e8",
              fontSize: 13,
            },
            "& .MuiDataGrid-footerContainer": {
              backgroundColor: "#eef6e6",
              borderTop: "1px solid #d8edbd",
            },
          }}
        />
      </div>

      {/* ── Delete dialog ── */}
      <DeleteDialog
        open={!!deleteTarget}
        name={deleteTarget?.species_name ?? ""}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

/* ─── Delete icon button ──────────────────────────────────────────── */
function DeleteBtn({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 8,
        border: "none",
        backgroundColor: hovered ? "#fef2f2" : "transparent",
        color: hovered ? "#dc2626" : "#9ca3af",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <DeleteIcon sx={{ fontSize: 18 }} />
    </button>
  );
}
