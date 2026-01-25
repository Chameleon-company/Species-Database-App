import { useState, useRef } from "react";
import TheDrawer from "../Components/drawer";

export function AddExcel() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_URL = import.meta.env.VITE_API_BASE;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setMessage("");
    setError("");
  };

  const handleButtonClick = () => {
    if (!file) {
      fileInputRef.current?.click();
    } else {
      handleUpload();
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setMessage("");
    setError("");

    try {
      //token needed for upload endpoint
      const token = localStorage.getItem("admin_token")
  
      const response = await fetch(`${API_URL}/upload-species`, {
        method: "POST",
        headers: {Authorization: token || "",},
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setMessage(`✅ Upload successful! ${result.rows_inserted ?? ""}`);
      setFile(null);
    } catch (err: any) {
      setError(
        err?.message || "Upload failed"
      );
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TheDrawer />
      <h1 style={{ marginBottom: "16px" }}>Upload Species Excel</h1>
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "40px",
            textAlign: "center",
            borderRadius: "12px",
            backgroundColor: "#f9fafb",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <p style={{ color: "#555", lineHeight: "1.6", marginBottom: "32px" }}>
            Please upload an <strong>.xlsx</strong> file containing plant
            species data.
            <br />
            The file must follow the predefined column format.
            <br />
            <br />
            <em>Only Excel (.xlsx) files are supported.</em>
          </p>

          {/* Hidden file input */}
          <input
            type="file"
            accept=".xlsx"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <button
            onClick={handleButtonClick}
            disabled={loading}
            style={{
              padding: "14px 36px",
              fontSize: "16px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
              transition: "all 0.2s ease",
            }}
          >
            {loading
              ? "Uploading..."
              : file
              ? "Upload Excel File"
              : "Choose Excel File"}
          </button>

          {file && (
            <div style={{ marginTop: "16px", color: "#333" }}>
              Selected file: <strong>{file.name}</strong>
            </div>
          )}

          {message && (
            <div style={{ marginTop: "24px", color: "green" }}>{message}</div>
          )}

          {error && (
            <div style={{ marginTop: "24px", color: "red" }}>{error}</div>
          )}
        </div>
      </div>
    </>
  );
}
