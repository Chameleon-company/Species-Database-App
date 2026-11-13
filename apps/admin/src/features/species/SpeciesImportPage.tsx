import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@sda/ui/components/card";
import { Spinner } from "@sda/ui/components/spinner";
import { ApiError } from "../../shared/api/apiClient";
import FileDropzone from "../../shared/ui/FileDropzone";
import Page from "../../shared/ui/Page";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useImportSpreadsheet } from "./api";

const EXCEL_EXTENSIONS = [".xlsx", ".xls"];

const isExcel = (file: File) => EXCEL_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

export default function SpeciesImportPage() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const importSpreadsheet = useImportSpreadsheet();
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    if (!isExcel(file)) {
      toast.error(t("onlyExcelAllowed"));
      return;
    }
    importSpreadsheet.mutate(file, {
      onSuccess: () => toast.success(t("uploadSuccess")),
      onError: (error) =>
        toast.error(error instanceof ApiError && error.message ? error.message : t("uploadFailed")),
    });
  };

  return (
    <Page title={t("uploadTitle")} subtitle={t("uploadDescription")}>
      <Card className="gap-4 rounded-2xl py-6 shadow-card">
        <CardContent className="flex flex-col gap-4 px-6">
          <FileDropzone
            accept={EXCEL_EXTENSIONS.join(",")}
            onFile={handleFile}
            disabled={importSpreadsheet.isPending}
            title={t("uploadSpecies")}
            dropTitle={t("dropFile")}
            hint={t("dragOrClick")}
          />
          {fileName && (
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3 text-compact">
              <FileSpreadsheet className="size-5 text-brand-accent" />
              <span className="flex-1 truncate font-medium">{fileName}</span>
              {importSpreadsheet.isPending && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Spinner />
                  {t("processingFile")}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
