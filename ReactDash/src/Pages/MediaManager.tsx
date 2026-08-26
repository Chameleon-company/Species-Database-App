import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import ImageIcon from "@mui/icons-material/Image";
import VideocamIcon from "@mui/icons-material/Videocam";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { adminFetch } from "../utils/adminFetch";
import LanguageToggle from "../Components/LanguageToggle";
import { translations } from "../translations";
import { useLanguage } from "../LanguageContext";
import { resolveErrorKey } from "../utils/errorMessages";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Collapse,
  IconButton,
} from "@mui/material";

type Media = {
  media_id: number;
  species_name: string;
  media_type: string;
  download_link: string;
  alt_text?: string;
};

// Detects whether a URL already points directly at an image file
function looksLikeDirectImage(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(url);
}

// Checks that a string is a real, well-formed http(s) URL - not just a
// non-empty string. Used to catch obviously-invalid entries like "d" or
// "asdf" before they ever reach the backend.
function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Media URLs can come from many different sources. Some are already direct
// image files; others are webpage links (e.g. an article about a species)
// that merely CONTAIN an image. This hook resolves the latter via the
// backend, which fetches the page server-side and extracts its real image.
function useResolvedImageUrl(rawUrl: string, skip: boolean = false) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);

  useEffect(() => {
    setResolvedUrl(null);
    setResolveFailed(false);

    if (!rawUrl || skip) return;

    if (looksLikeDirectImage(rawUrl)) {
      setResolvedUrl(rawUrl);
      return;
    }

    const API_URL = import.meta.env.VITE_API_BASE;
    setResolving(true);

    adminFetch(`${API_URL}/api/resolve-image?url=${encodeURIComponent(rawUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error("resolve failed");
        return res.json();
      })
      .then((data) => setResolvedUrl(data.resolved_url))
      .catch(() => setResolveFailed(true))
      .finally(() => setResolving(false));
  }, [rawUrl, skip]);

  return { resolvedUrl, resolving, resolveFailed };
}

// Extracts the 11-character YouTube video ID from any common URL format:
// youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, youtube.com/shorts/ID
function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function ThumbCell({
  url,
  type,
  t,
  onPreview,
}: {
  url: string;
  type: string;
  t: (key: string) => string;
  onPreview: () => void;
}) {
  const [, setErr] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const {
    resolvedUrl,
    resolving: imageResolving,
    resolveFailed: imageResolveFailed,
  } = useResolvedImageUrl(url, type !== "image");

  useEffect(() => {
    if (url) {
      setErr(false);
      setStatus("loading");
    }
  }, [url]);

  // A row with no URL yet, or no type selected yet (still "Select"), is
  // incomplete - show the neutral placeholder rather than attempting to
  // resolve/preview it, which would otherwise render a broken-looking
  // error state mid-edit.
  if (!url || !type) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          height: "100%",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "1px dashed #d1d5db",
            backgroundColor: "#f9fafb",
            color: "#9ca3af",
            fontSize: 10,
          }}
        >
          <ImageIcon sx={{ fontSize: 18 }} />
          <span>{t("noMedia")}</span>
        </div>
      </div>
    );
  }

  if (type === "video") {
    const youtubeId = getYoutubeId(url);
    const thumbUrl = youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      : null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          onClick={onPreview}
          style={{
            position: "relative",
            width: 64,
            height: 64,
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #d8edbd",
            backgroundColor: "#1a2e10",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform =
              "scale(1.08)";
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 4px 16px rgba(0,0,0,0.18)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
          }}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={t("mediaPreview")}
              onLoad={() => setStatus("success")}
              onError={() => {
                setErr(true);
                setStatus("error");
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <VideocamIcon sx={{ color: "#86b85a", fontSize: 22 }} />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PlayArrowIcon sx={{ color: "#ffffff", fontSize: 16 }} />
            </div>
          </div>
        </div>

        {youtubeId ? (
          <div style={{ fontSize: 9, textAlign: "center", lineHeight: 1 }}>
            {status === "loading" && "⏳"}
            {status === "success" && "✅"}
            {status === "error" && "❌"}
          </div>
        ) : (
          <span style={{ fontSize: 10, color: "#9ca3af" }}>{t("video")}</span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      {imageResolving ? (
        <div
          style={{
            width: 64,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "1px solid #d8edbd",
            backgroundColor: "#f9fafb",
            fontSize: 18,
          }}
        >
          ⏳
        </div>
      ) : imageResolveFailed || !resolvedUrl ? (
        <div
          style={{
            width: 64,
            height: 64,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            borderRadius: 8,
            border: "1px dashed #fca5a5",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            fontSize: 9,
            textAlign: "center",
            padding: 4,
          }}
        >
          <span>❌</span>
          <span>{t("noImageFound")}</span>
        </div>
      ) : (
        <img
          src={resolvedUrl}
          alt={t("mediaPreview")}
          onLoad={() => setStatus("success")}
          onError={() => {
            setErr(true);
            setStatus("error");
          }}
          onClick={onPreview}
          style={{
            width: 64,
            height: 64,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #d8edbd",
            cursor: "zoom-in",
            transition: "transform 0.15s, box-shadow 0.15s",
            display: "block",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLImageElement).style.transform =
              "scale(1.08)";
            (e.currentTarget as HTMLImageElement).style.boxShadow =
              "0 4px 16px rgba(0,0,0,0.18)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLImageElement).style.boxShadow = "none";
          }}
        />
      )}

      {!imageResolving && resolvedUrl && (
        <div style={{ fontSize: 9, textAlign: "center", lineHeight: 1 }}>
          {status === "loading" && "⏳"}
          {status === "success" && "✅"}
          {status === "error" && "❌"}
        </div>
      )}

      {status === "error" && resolvedUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setErr(false);
            setStatus("loading");
          }}
          style={{
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 6,
            border: "1px solid #d8edbd",
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          {t("retry")}
        </button>
      )}
    </div>
  );
}

function MediaPreviewDialog({
  media,
  onClose,
  t,
}: {
  media: Media | null;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const open = !!media;
  const youtubeId = media?.media_type === "video" ? getYoutubeId(media.download_link) : null;
  const {
    resolvedUrl: dialogResolvedUrl,
    resolving: dialogResolving,
    resolveFailed: dialogResolveFailed,
  } = useResolvedImageUrl(
    media?.download_link || "",
    media?.media_type === "video"
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: 16,
          fontFamily: "inherit",
          backgroundColor: "#f7fbf2",
        },
      }}
    >
      {media && (
        <>
          <DialogTitle
            sx={{
              fontWeight: 700,
              fontSize: 18,
              color: "#1a2e10",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ fontStyle: "italic" }}>
              {media.species_name || t("untitled")}
            </span>
            <TypeBadge type={media.media_type} t={t} />
          </DialogTitle>

          <DialogContent sx={{ pb: 3 }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "#000",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {media.media_type === "video" && youtubeId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                  title={media.species_name}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : media.media_type === "video" ? (
                <span style={{ color: "#9ca3af", fontSize: 13 }}>
                  {t("previewNotAvailable")}
                </span>
              ) : dialogResolving ? (
                <span style={{ color: "#9ca3af", fontSize: 13 }}>
                  {t("Loading Image..")}
                </span>
              ) : dialogResolveFailed || !dialogResolvedUrl ? (
                <span style={{ color: "#fca5a5", fontSize: 13 }}>
                  {t("noImageFound")}
                </span>
              ) : (
                <img
                  src={dialogResolvedUrl}
                  alt={media.alt_text || media.species_name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                <strong style={{ color: "#3d5a2a", minWidth: 80 }}>
                  {t("mediaUrl")}:
                </strong>
                <a
                  href={media.download_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#2d6a0a",
                    wordBreak: "break-all",
                    textDecoration: "none",
                  }}
                >
                  {media.download_link}
                </a>
              </div>

              {media.alt_text && (
                <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                  <strong style={{ color: "#3d5a2a", minWidth: 80 }}>
                    {t("altText")}:
                  </strong>
                  <span style={{ color: "#4b5563" }}>{media.alt_text}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                <strong style={{ color: "#3d5a2a", minWidth: 80 }}>
                  {t("id")}:
                </strong>
                <span style={{ color: "#4b5563" }}>{media.media_id}</span>
              </div>
            </div>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <button
              onClick={onClose}
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
              {t("close")}
            </button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function TypeBadge({ type, t }: { type: string; t: (key: string) => string }) {
  const isImage = type === "image";

  return (
    <span
      style={{
        display: "inline-flex",
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        height: 22,
        width: "fit-content",
        maxWidth: "fit-content",
        padding: "0 8px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        lineHeight: 1,
        backgroundColor: isImage ? "#eef6e6" : "#eff6ff",
        color: isImage ? "#2d6a0a" : "#1d4ed8",
        border: `1px solid ${isImage ? "#c2e29a" : "#bfdbfe"}`,
      }}
    >
      {isImage ? (
        <ImageIcon sx={{ fontSize: 12 }} />
      ) : (
        <VideocamIcon sx={{ fontSize: 12 }} />
      )}
      {isImage ? t("image") : t("video")}
    </span>
  );
}

function DeleteDialog({
  open,
  name,
  onClose,
  onConfirm,
  t,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
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
        {t("deleteMediaTitle")}
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ fontSize: 14, color: "#4b5563" }}>
          {t("deleteMediaConfirm")}{" "}
          <strong style={{ color: "#1a2e10" }}>{name}</strong>?
        </DialogContentText>
        <DialogContentText sx={{ fontSize: 13, color: "#9ca3af", mt: 1 }}>
          {t("cannotBeUndone")}
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
          {t("cancel")}
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
          {t("delete")}
        </button>
      </DialogActions>
    </Dialog>
  );
}

export default function MediaManager() {
  const { lang } = useLanguage();

  const t = (key: string) => (translations as any)[key]?.[lang] || key;

  const [media, setMedia] = useState<Media[]>([]);
  const [filtered, setFiltered] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  // errorKey drives what's shown to the user, resolved from HTTP status
  // for backend errors, or set directly for client-side validation
  // (never from backend message text - see errorMessages.ts for why).
  const [errorKey, setErrorKey] = useState<string | null>(null);
  // Whether the current error came from loading the list itself (rather
  // than a save/delete) - drives whether the banner offers a Retry action.
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [addHovered, setAddHovered] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Media | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Media | null>(null);

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
              m.alt_text?.toLowerCase().includes(q)
          )
        : media
    );
  }, [search, media]);

  const fetchMedia = async () => {
    setLoading(true);
    setErrorKey(null);
    setLoadFailed(false);

    try {
      const res = await adminFetch(`${API_URL}/upload-media`, {});
      if (!res.ok) {
        setErrorKey(resolveErrorKey("fetch", res.status));
        setLoadFailed(true);
        setMedia([]);
        return;
      }

      const data = await res.json();
      setMedia(Array.isArray(data) ? data : []);
    } catch {
      // The request never got a response at all (offline, DNS, CORS, etc).
      setErrorKey(resolveErrorKey("fetch", 0));
      setLoadFailed(true);
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

  // Removes a newly-added, unsaved row directly from local state.
  // No backend call and no confirmation dialog - it was never persisted.
  const cancelNewRow = (row: Media) => {
    setMedia((prev) => prev.filter((m) => m.media_id !== row.media_id));
  };

  const saveMedia = async (row: Media) => {
    if (!row.species_name || !row.media_type || !row.download_link) {
      setErrorKey("errorMediaRequiredFields");
      return row;
    }

    // URL format validation: catches obviously-invalid entries (e.g. "d",
    // "asdf") before they ever reach the backend.
    if (!isValidUrl(row.download_link)) {
      setErrorKey("errorInvalidMediaUrl");
      return row;
    }

    const isNew = row.media_id < 0;
    const url = isNew
      ? `${API_URL}/upload-media`
      : `${API_URL}/upload-media/${row.media_id}`;

    setLoading(true);
    setErrorKey(null);
    setLoadFailed(false);

    try {
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify(row),
      });

      if (!res.ok) {
        const key = resolveErrorKey("save", res.status);

        if (res.status === 409) {
          // Genuine duplicate of an existing entry - refresh so the
          // leftover, never-actually-saved row is cleared from the table
          // instead of lingering there indefinitely.
          await fetchMedia();
        }

        setErrorKey(key);
        return row;
      }

      await fetchMedia();
    } catch {
      // The request never got a response at all (offline, DNS, CORS, etc).
      setErrorKey(resolveErrorKey("save", 0));
    } finally {
      setLoading(false);
    }

    return row;
  };

  const handleDeleteClick = (row: Media) => {
    // Unsaved new row (never hit the backend) - just remove it locally,
    // no need for a confirmation dialog or an API call.
    if (row.media_id < 0) {
      setMedia((prev) => prev.filter((m) => m.media_id !== row.media_id));
      return;
    }
    setDeleteTarget(row);
  };
  const handleDeleteClose = () => setDeleteTarget(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleteTarget(null);
    setLoading(true);
    setErrorKey(null);
    setLoadFailed(false);

    try {
      const res = await adminFetch(
        `${API_URL}/upload-media/${deleteTarget.media_id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        setErrorKey(resolveErrorKey("delete", res.status));
        return;
      }

      await fetchMedia();
    } catch {
      setErrorKey(resolveErrorKey("delete", 0));
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "preview",
      headerName: t("preview"),
      width: 80,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          <ThumbCell
            url={params.row.download_link}
            type={params.row.media_type}
            t={t}
            onPreview={() => setPreviewTarget(params.row)}
          />
        </div>
      ),
    },
    {
      field: "media_id",
      headerName: t("id"),
      width: 70,
      valueGetter: (_value: any, row: Media) =>
        row.media_id < 0 ? t("new") : row.media_id,
    },
    {
      field: "species_name",
      headerName: t("speciesName"),
      width: 200,
      editable: true,
      renderCell: (params: GridRenderCellParams) => (
        <span style={{ fontStyle: "italic", color: "#1a2e10", fontWeight: 500 }}>
          {params.value || (
            <span style={{ color: "#9ca3af", fontStyle: "normal" }}>
              {t("clickToEdit")}
            </span>
          )}
        </span>
      ),
    },
    {
      field: "media_type",
      headerName: t("type"),
      width: 100,
      editable: true,
      type: "singleSelect",
      valueOptions: ["image", "video"],
      renderCell: (params: GridRenderCellParams) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            height: "100%",
          }}
        >
          {params.value ? (
            <TypeBadge type={params.value} t={t} />
          ) : (
            <span style={{ color: "#9ca3af", fontSize: 12 }}>
              {t("select")}
            </span>
          )}
        </div>
      ),
    },
    {
      field: "download_link",
      headerName: t("mediaUrl"),
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
          {params.value || (
            <span style={{ color: "#9ca3af" }}>{t("pasteUrl")}</span>
          )}
        </span>
      ),
    },
    {
      field: "alt_text",
      headerName: t("altText"),
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
      renderCell: (params: GridRenderCellParams) =>
        params.row.media_id < 0 ? (
          <CancelBtn onClick={() => cancelNewRow(params.row)} />
        ) : (
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            {t("media")}
          </h1>

          <p
            style={{
              fontSize: 13,
              color: "#7a9464",
              marginTop: 4,
              fontWeight: 400,
            }}
          >
            {media.length} {t("items")} · {imageCount} {t("images")} ·{" "}
            {videoCount} {t("videos")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
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
            {t("addMedia")}
          </button>
        </div>
      </div>

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
          placeholder={t("search")}
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

      <Collapse in={!!errorKey} unmountOnExit>
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon sx={{ fontSize: 20 }} />}
          action={
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {loadFailed && (
                <button
                  onClick={() => fetchMedia()}
                  style={{
                    background: "none",
                    border: "1px solid #fca5a5",
                    borderRadius: 8,
                    color: "#b91c1c",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {t("retry")}
                </button>
              )}
              <IconButton
                size="small"
                onClick={() => setErrorKey(null)}
                sx={{ color: "#dc2626" }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </div>
          }
          sx={{
            borderRadius: "12px",
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: "14px",
            alignItems: "center",
            boxShadow: "0 2px 10px rgba(220,38,38,0.08)",
            "& .MuiAlert-icon": { color: "#dc2626" },
            "& .MuiAlert-message": { display: "flex", alignItems: "center" },
          }}
        >
          {t(errorKey ?? "errorGeneric")}
        </Alert>
      </Collapse>

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
          localeText={{
            noRowsLabel: t("noRows"),
          }}
          loading={loading}
          editMode="row"
          rowHeight={95}
          processRowUpdate={async (row) => {
            await saveMedia(row);
            return row;
          }}
          onProcessRowUpdateError={() => {
            setLoadFailed(false);
            setErrorKey(resolveErrorKey("save"));
          }}
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
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f7fbf2",
            },
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

      <DeleteDialog
        open={!!deleteTarget}
        name={deleteTarget?.species_name ?? ""}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        t={t}
      />

      <MediaPreviewDialog
        media={previewTarget}
        onClose={() => setPreviewTarget(null)}
        t={t}
      />
    </div>
  );
}

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

// Used only on newly-added, unsaved rows. Removes the row immediately from
// local state with no confirmation dialog and no backend call, since there
// is nothing saved yet to lose - functions as "cancel adding this media".
function CancelBtn({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Cancel"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 8,
        border: "none",
        backgroundColor: hovered ? "#f3f4f6" : "transparent",
        color: hovered ? "#4b5563" : "#9ca3af",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <CloseIcon sx={{ fontSize: 18 }} />
    </button>
  );
}