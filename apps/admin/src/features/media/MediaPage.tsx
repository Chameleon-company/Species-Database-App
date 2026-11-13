import { useMemo, useState } from "react";
import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@sda/ui/components/button";
import { Card, CardContent } from "@sda/ui/components/card";
import { DataTable, DataTableText } from "@sda/ui/components/data-table";
import { dataTableColumnHelper } from "@sda/ui/lib/data-table";
import { ApiError } from "../../shared/api/apiClient";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import LoadError from "../../shared/ui/LoadError";
import Page from "../../shared/ui/Page";
import SearchField from "../../shared/ui/SearchField";
import { useTableText } from "../../shared/ui/useTableText";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useDeleteMedia, useMediaList } from "./api";
import { resolveErrorKey } from "./errorMessages";
import type { Media } from "./media";
import MediaDialog from "./MediaDialog";
import MediaPreviewDialog from "./MediaPreviewDialog";
import { MediaThumb, TypeBadge } from "./MediaVisuals";

const column = dataTableColumnHelper<Media>();

const INSTRUCTION_KEYS = [
  "adminMediaInstructionsAdd",
  "adminMediaInstructionsUrl",
  "adminMediaInstructionsFormats",
  "adminMediaInstructionsAlt",
  "adminMediaInstructionsReplace",
];

const matches = (media: Media, query: string) =>
  [media.species_name, media.media_type, media.alt_text].some((value) => value?.toLowerCase().includes(query));

export default function MediaPage() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const { emptyLabel, labels } = useTableText();

  const media = useMediaList();
  const deleteMedia = useDeleteMedia();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; media: Media | null }>({ open: false, media: null });
  const [preview, setPreview] = useState<Media | null>(null);
  const [toDelete, setToDelete] = useState<Media | null>(null);

  const all = useMemo(() => media.data ?? [], [media.data]);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? all.filter((item) => matches(item, query)) : all;
  }, [all, search]);

  const imageCount = all.filter((item) => item.media_type === "image").length;
  const videoCount = all.filter((item) => item.media_type === "video").length;

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMedia.mutate(toDelete.media_id, {
      onSuccess: () => toast.success(t("mediaDeletedSuccessfully")),
      onError: (error) => toast.error(t(resolveErrorKey("delete", error instanceof ApiError ? error.status : undefined))),
      onSettled: () => setToDelete(null),
    });
  };

  const columns = column.columns([
    column.display({
      id: "preview",
      header: t("preview"),
      cell: ({ row }) => <MediaThumb media={row.original} onPreview={() => setPreview(row.original)} />,
      meta: { className: "w-22" },
    }),
    column.accessor("media_id", { header: t("id"), meta: { className: "w-17" } }),
    column.accessor("species_name", {
      header: t("speciesName"),
      cell: ({ getValue }) => <span className="font-medium italic">{getValue()}</span>,
      meta: { className: "min-w-50" },
    }),
    column.accessor("media_type", {
      header: t("type"),
      cell: ({ getValue }) => <TypeBadge type={getValue()} />,
      meta: { className: "w-28" },
    }),
    column.accessor("download_link", {
      header: t("mediaUrl"),
      enableSorting: false,
      cell: ({ getValue }) => <DataTableText className="max-w-105 text-body">{getValue()}</DataTableText>,
      meta: { className: "min-w-65" },
    }),
    column.accessor((row) => row.alt_text ?? "", {
      id: "alt_text",
      header: t("altText"),
      cell: ({ getValue }) => <span className="text-icon">{getValue().trim() || <span className="text-faint">{t("notAvailable")}</span>}</span>,
      meta: { className: "min-w-45" },
    }),
    column.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("edit")}
            className="text-faint hover:bg-accent hover:text-primary"
            onClick={() => setDialog({ open: true, media: row.original })}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("delete")}
            className="text-faint hover:bg-destructive-soft hover:text-destructive"
            onClick={() => setToDelete(row.original)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
      meta: { className: "w-24" },
    }),
  ]);

  return (
    <Page
      title={t("media")}
      subtitle={`${all.length} ${t("items")} · ${imageCount} ${t("images")} · ${videoCount} ${t("videos")}`}
      actions={
        <Button onClick={() => setDialog({ open: true, media: null })} disabled={media.isPending}>
          <Plus />
          {t("addMedia")}
        </Button>
      }
    >
      <Card className="gap-2 rounded-xl py-4.5 shadow-none">
        <CardContent className="px-5">
          <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold">
            <ImageIcon className="size-5 text-primary" />
            {t("adminMediaInstructionsTitle")}
          </h2>
          <div className="flex flex-col gap-2 text-compact leading-relaxed text-body">
            {INSTRUCTION_KEYS.map((key) => (
              <p key={key}>{t(key)}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <SearchField value={search} onChange={setSearch} placeholder={t("search")} />

      {media.isError ? (
        <LoadError onRetry={() => media.refetch()}>{t(resolveErrorKey("fetch"))}</LoadError>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => String(row.media_id)}
          loading={media.isPending}
          emptyLabel={emptyLabel}
          labels={labels}
        />
      )}

      <MediaDialog open={dialog.open} media={dialog.media} onClose={() => setDialog({ open: false, media: null })} />
      <MediaPreviewDialog media={preview} onClose={() => setPreview(null)} />
      <ConfirmDialog
        open={toDelete !== null}
        title={t("deleteMediaTitle")}
        confirmLabel={t("delete")}
        pending={deleteMedia.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        <p>
          {t("deleteMediaConfirm")} <strong className="text-foreground">{toDelete?.species_name}</strong>?
        </p>
        <p className="mt-2 text-faint">{t("cannotBeUndone")}</p>
      </ConfirmDialog>
    </Page>
  );
}
