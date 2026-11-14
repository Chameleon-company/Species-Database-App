import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@sda/ui/components/card";
import { Spinner } from "@sda/ui/components/spinner";
import { ApiError } from "../../shared/api/apiClient";
import FileDropzone from "../../shared/ui/FileDropzone";
import Page from "../../shared/ui/Page";
import { useLanguage } from "../../useLanguage";
import { useImportSpreadsheet } from "./api";

const EXCEL_EXTENSION = ".xlsx";

/** The API reads a file as Excel only when its name ends in lowercase ".xlsx"; anything else is parsed as CSV. */
const isExcel = (file: File) => file.name.endsWith(EXCEL_EXTENSION);

export default function SpeciesImportPage() {
  const { t } = useLanguage();
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
            accept={EXCEL_EXTENSION}
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
                  <Spinner aria-label={t("loading")} />
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
