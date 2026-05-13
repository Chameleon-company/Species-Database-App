import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowLeft, X, Image, Video } from "lucide-react";
import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";

type MediaType = "image" | "video";

export default function BulkMediaUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = import.meta.env.VITE_API_BASE;

  const [lang, setLang] = useState<"en" | "tet">(
    (localStorage.getItem("lang") as "en" | "tet") || "en"
  );
  const [scientificName, setScientificName] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  const t = (key: string) => (translations as any)[key]?.[lang] || key;

  const changeLang = (newLang: "en" | "tet") => {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = (selectedFiles: FileList | null) => {
    setError("");
    if (!selectedFiles?.length) return;
    setFiles(Array.from(selectedFiles));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!scientificName.trim()) {
      setError(t("bulkMediaScientificNameRequired"));
      return;
    }

    if (!files.length) {
      setError(t("bulkMediaFilesRequired"));
      return;
    }

    setStatus("submitting");

    try {
      for (const file of files) {
        const downloadLink = URL.createObjectURL(file);

        const response = await adminFetch(`${API_URL}/upload-media`, {
          method: "POST",
          body: JSON.stringify({
            species_name: scientificName.trim(),
            media_type: mediaType,
            download_link: downloadLink,
            alt_text: file.name,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || t("bulkMediaUploadFailed"));
        }
      }

      setStatus("done");
      navigate("/Media");
    } catch (submitError: unknown) {
      setStatus("idle");
      setError(submitError instanceof Error ? submitError.message : t("bulkMediaUploadFailed"));
    }
  };

  return (
    <div
      style={{
        padding: "28px 36px",
        background: "linear-gradient(180deg, #f4faf0 0%, #edf7e6 100%)",
        fontFamily: "'DM Sans', sans-serif",
        minHeight: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
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
            {t("bulkMediaUpload")}
          </h1>
          <p style={{ fontSize: 13, color: "#6b8a56", marginTop: 6 }}>
            {t("bulkMediaUploadDescription")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: 4,
              borderRadius: 10,
              border: "1px solid #d8edbd",
              backgroundColor: "#eef6e6",
            }}
          >
            <button
              type="button"
              onClick={() => changeLang("en")}
              style={{
                padding: "8px 22px",
                border: "none",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: lang === "en" ? "#2d6a0a" : "#7a9464",
                background: lang === "en" ? "#ffffff" : "transparent",
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLang("tet")}
              style={{
                padding: "8px 22px",
                border: "none",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: lang === "tet" ? "#2d6a0a" : "#7a9464",
                background: lang === "tet" ? "#ffffff" : "transparent",
              }}
            >
              TET
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/Media")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid #cfe2b5",
              backgroundColor: "#ffffff",
              color: "#2d6a0a",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
            {t("backToMedia")}
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 860,
          margin: "0 auto",
          backgroundColor: "#ffffff",
          border: "1px solid #d8edbd",
          borderRadius: 20,
          boxShadow: "0 8px 24px rgba(45,106,10,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 24,
            borderBottom: "1px solid #edf4e4",
            background: "linear-gradient(180deg, #fbfef7 0%, #f5fbef 100%)",
          }}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#36582f" }}>
                {t("scientificName")}
              </span>
              <input
                value={scientificName}
                onChange={(event) => setScientificName(event.target.value)}
                placeholder="Falcataria falcata"
                style={{
                  border: "1px solid #d8edbd",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 14,
                  outline: "none",
                  backgroundColor: "#ffffff",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#36582f" }}>
                {t("type")}
              </span>
              <select
                value={mediaType}
                onChange={(event) => setMediaType(event.target.value as MediaType)}
                style={{
                  border: "1px solid #d8edbd",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 14,
                  outline: "none",
                  backgroundColor: "#ffffff",
                }}
              >
                <option value="image">{t("image")}</option>
                <option value="video">{t("video")}</option>
              </select>
            </label>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div
            onClick={openFilePicker}
            style={{
              border: "2px dashed #cfe2b5",
              borderRadius: 18,
              padding: 28,
              backgroundColor: "#fbfef7",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <Upload size={30} color="#2d6a0a" />
            <h2 style={{ margin: "14px 0 6px", color: "#1a2e10" }}>
              {t("bulkMediaSelectFiles")}
            </h2>
            <p style={{ margin: 0, color: "#6b8a56", fontSize: 14 }}>
              {t("bulkMediaUploadHint")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(event) => handleFiles(event.target.files)}
              style={{ display: "none" }}
            />
          </div>

          {files.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <strong style={{ color: "#1a2e10" }}>{t("bulkMediaSelectedFiles")}</strong>
                <span style={{ color: "#6b8a56", fontSize: 13 }}>{files.length}</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {files.map((file, index) => {
                  const fileIcon = file.type.startsWith("video/") ? (
                    <Video size={16} />
                  ) : (
                    <Image size={16} />
                  );

                  return (
                    <div
                      key={`${file.name}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 14px",
                        border: "1px solid #e5f1d7",
                        borderRadius: 14,
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            display: "grid",
                            placeItems: "center",
                            backgroundColor: "#eef6e6",
                            color: "#2d6a0a",
                          }}
                        >
                          {fileIcon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#1a2e10" }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#6b8a56" }}>
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#9ca3af",
                          cursor: "pointer",
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 12,
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {status === "submitting" && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 12,
                backgroundColor: "#eef6e6",
                border: "1px solid #d8edbd",
                color: "#2d6a0a",
                fontSize: 14,
              }}
            >
              {t("bulkMediaUploading")}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
            <button
              type="submit"
              disabled={status === "submitting"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 20px",
                borderRadius: 12,
                border: "none",
                backgroundColor: status === "submitting" ? "#86b85a" : "#2d6a0a",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                cursor: status === "submitting" ? "not-allowed" : "pointer",
                boxShadow: "0 6px 18px rgba(45,106,10,0.22)",
              }}
            >
              <Upload size={16} />
              {t("bulkMediaSubmit")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}