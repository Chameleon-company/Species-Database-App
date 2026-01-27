import React, { useState, useRef, type DragEvent } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

interface UploadedFile {
  file: File;
  status: "uploading" | "success" | "error";
  message?: string;
}

export default function AddExcel() {
  const API_URL = import.meta.env.VITE_API_BASE;
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
    e.preventDefault();
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
        message: "Only Excel files (.xlsx) are supported",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // Simulate upload process

    try {
      setUploadedFile({
        file,
        status: "uploading",
        message: "Processing file...",
      });

      //token needed for upload endpoint
      const token = localStorage.getItem("admin_token");

      const response = await fetch(`${API_URL}/upload-species`, {
        method: "POST",
        headers: { Authorization: token || "" },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }
      setUploadedFile({
        file,
        status: "success",
        message: "File uploaded successfully",
      });
    } catch (err: any) {
      setUploadedFile({
        file,
        status: "error",
        message: err?.message || "Upload failed",
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
        }

        .animate-progress {
          animation: progress 1.5s ease-in-out;
        }

        .animate-shimmer::before {
          animation: shimmer 0.5s ease;
        }

        
      `}</style>

      <div className="w-full mx-auto p-5 animate-fadeInUp font-dm">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-playfair text-[42px] md:text-5xl font-bold text-gray-900 mb-3 tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Species Data Upload
          </h1>
          <p className="text-base text-gray-600 font-normal leading-relaxed">
            Import plant species data securely and efficiently
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_4px_6px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.04),0_24px_48px_rgba(0,0,0,0.06)] transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[0_8px_12px_rgba(0,0,0,0.03),0_16px_32px_rgba(0,0,0,0.06),0_32px_64px_rgba(0,0,0,0.08)]">
          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 md:p-16 text-center cursor-pointer transition-all duration-300 overflow-hidden
              ${
                dragActive
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 bg-gray-50 hover:border-blue-600 hover:bg-blue-50/50"
              }
              before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-600/5 before:to-blue-600/[0.02] before:opacity-0 before:transition-opacity before:duration-300
              ${dragActive ? "before:opacity-100" : "hover:before:opacity-100"}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
          >
            {/* Upload Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-[20px] flex items-center justify-center shadow-[0_8px_24px_rgba(13,110,253,0.2)] transition-all duration-300 animate-float hover:scale-105 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(13,110,253,0.3)]">
              <Upload className="text-white w-9 h-9" />
            </div>

            {/* Text */}
            <div className="text-xl font-semibold text-gray-900 mb-2">
              {dragActive ? "Drop your file here" : "Upload Species Data"}
            </div>
            <p className="text-[15px] text-gray-600 mb-6 leading-normal">
              Drag and drop your Excel file here, or click to browse
            </p>

            {/* Upload Button */}
            <button
              className="relative bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none px-8 py-3.5 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(13,110,253,0.2)] overflow-hidden
                hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(13,110,253,0.3)] active:translate-y-0
                before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full before:transition-transform before:duration-500 hover:before:translate-x-full animate-shimmer"
              type="button"
            >
              Choose Excel File
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleChange}
            />
          </div>

          {/* Format Note */}
          <div className="mt-8 p-5 bg-gray-50 rounded-xl border-l-4 border-blue-600">
            <div className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet size={16} />
              Format Requirements
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              Please ensure your Excel file follows the predefined column format
              for plant species data. Only .xlsx files are supported.
            </p>
          </div>

          {/* File Preview */}
          {uploadedFile && (
            <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl animate-slideIn">
              {/* File Preview Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* File Icon */}
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex-shrink-0">
                    <FileSpreadsheet className="text-green-600 w-6 h-6" />
                  </div>

                  {/* File Details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-gray-900 mb-1 break-all">
                      {uploadedFile.file.name}
                    </div>
                    <div className="text-[13px] text-gray-600">
                      {(uploadedFile.file.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>

                {/* Remove Button */}
                <div className="bg-white border-none w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-white hover:bg-gray-50 hover:text-red-600 flex-shrink-0">
                  <button
                    onClick={removeFile}
                    type="button"
                    aria-label="Remove file"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status Messages */}
              {uploadedFile.status === "uploading" && (
                <>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-blue-100 text-blue-900">
                    <Upload className="w-[18px] h-[18px]" />
                    {uploadedFile.message}
                  </div>
                  <div className="h-1 bg-gray-200 rounded-sm overflow-hidden mt-3">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-700 rounded-sm animate-progress" />
                  </div>
                </>
              )}

              {uploadedFile.status === "success" && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-green-100 text-green-900">
                  <CheckCircle2 className="w-[18px] h-[18px]" />
                  {uploadedFile.message}
                </div>
              )}

              {uploadedFile.status === "error" && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-red-100 text-red-900">
                  <AlertCircle className="w-[18px] h-[18px]" />
                  {uploadedFile.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
