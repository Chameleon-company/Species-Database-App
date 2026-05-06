import React, { useState, useRef, type DragEvent } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";

interface UploadedFile {
  file: File;
  status: "uploading" | "success" | "error";
  message?: string;
}

export default function AddExcel() {
  const API_URL = import.meta.env.VITE_API_BASE;

  const [lang, setLang] = useState<"en" | "tet">(
    (localStorage.getItem("lang") as "en" | "tet") || "en"
  );
  const t = (key: string) =>
    (translations as any)[key]?.[lang] || key;

  const changeLang = (newLang: "en" | "tet") => {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  };

  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const validExtensions = [".xlsx", ".xls"];
    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setUploadedFile({
        file,
        status: "error",
        message: t("onlyExcelAllowed"),
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadedFile({
        file,
        status: "uploading",
        message: t("processingFile"),
      });

      const response = await adminFetch(`${API_URL}/upload-species`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("uploadFailed"));
      }

      setUploadedFile({
        file,
        status: "success",
        message: t("uploadSuccess"),
      });
    } catch (err: any) {
      setUploadedFile({
        file,
        status: "error",
        message: err?.message || t("uploadFailed"),
      });
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex justify-between mb-4 items-center">
        <h2 className="text-3xl font-bold">{t("addExcel")}</h2>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => changeLang("en")}>EN</button>
          <button onClick={() => changeLang("tet")}>TET</button>
        </div>
      </div>

      <div className="w-full mx-auto p-5">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">
            {t("uploadTitle")}
          </h1>
          <p className="text-gray-600">
            {t("uploadDescription")}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow">
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer ${
              dragActive ? "border-blue-600 bg-blue-50" : "border-gray-300"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
          >
            <Upload className="mx-auto mb-4" />

            <div className="text-lg font-semibold">
              {dragActive ? t("dropFile") : t("uploadSpecies")}
            </div>

            <p className="text-gray-600 mb-4">
              {t("dragOrClick")}
            </p>

            <button type="button">
              {t("chooseFile")}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleChange}
            />
          </div>

          {uploadedFile && (
            <div className="mt-6">
              <div>{uploadedFile.file.name}</div>

              {uploadedFile.status === "uploading" && (
                <div>{t("uploading")}</div>
              )}

              {uploadedFile.status === "success" && (
                <div>{t("success")}</div>
              )}

              {uploadedFile.status === "error" && (
                <div>{t("error")}: {uploadedFile.message}</div>
              )}

              <button onClick={removeFile}>{t("remove")}</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}