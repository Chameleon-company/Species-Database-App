import { useEffect, useRef, useState } from "react";
import { Video, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@sda/ui/components/alert";
import { Button } from "@sda/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@sda/ui/components/dialog";
import { Field, FieldLabel } from "@sda/ui/components/field";
import type { MessageKey } from "@sda/i18n/translate";
import { ApiError } from "../../shared/api/apiClient";
import { useAppForm } from "../../shared/form/useAppForm";
import FileDropzone from "../../shared/ui/FileDropzone";
import { useLanguage } from "../../useLanguage";
import { useUpdateMedia, useUploadMedia } from "./api";
import { resolveErrorKey } from "./errorMessages";
import { isValidUrl, type Media, type MediaType } from "./media";

type MediaDialogProps = {
  open: boolean;
  media: Media | null;
  onClose: () => void;
};

type MediaValues = {
  species_name: string;
  media_type: "" | MediaType;
  alt_text: string;
  download_link: string;
};

const HEIC = /\.(heic|heif)$/i;

type ChosenFile = { file: File; previewUrl: string | null };

function FilePreview({ chosen, onRemove, removeLabel }: { chosen: ChosenFile; onRemove: () => void; removeLabel: string }) {
  const { file, previewUrl } = chosen;
  return (
    <div className="flex items-center gap-3 rounded-xl border p-2.5">
      {previewUrl ? (
        <img src={previewUrl} alt="" className="size-14 rounded-lg border object-cover" />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-foreground">
          <Video className="size-6 text-brand-accent" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-compact font-semibold">{file.name}</p>
        <p className="text-label font-normal tracking-normal text-muted-foreground">
          {(file.size / 1024 / 1024).toFixed(1)} MB
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={removeLabel}
        onClick={onRemove}
        className="rounded-full bg-destructive-soft text-destructive hover:bg-destructive-soft hover:text-destructive-hover"
      >
        <X />
      </Button>
    </div>
  );
}

function MediaForm({ media, onClose }: { media: Media | null; onClose: () => void }) {
  const { t } = useLanguage();
  const upload = useUploadMedia();
  const update = useUpdateMedia();
  const editing = media !== null;

  const [chosen, setChosen] = useState<ChosenFile | null>(null);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const file = chosen?.file ?? null;

  const choose = (next: ChosenFile | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = next?.previewUrl ?? null;
    setChosen(next);
  };

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const form = useAppForm({
    defaultValues: {
      species_name: media?.species_name ?? "",
      media_type: (media?.media_type as MediaValues["media_type"]) ?? "",
      alt_text: media?.alt_text ?? "",
      download_link: media?.download_link ?? "",
    } as MediaValues,
    onSubmit: async ({ value }) => {
      setErrorKey(null);
      const done = (key: MessageKey) => {
        toast.success(t(key));
        onClose();
      };
      const fail = (error: unknown) =>
        setErrorKey(resolveErrorKey("save", error instanceof ApiError ? error.status : undefined));

      if (editing) {
        if (!isValidUrl(value.download_link)) {
          setErrorKey("errorInvalidMediaUrl");
          return;
        }
        await update
          .mutateAsync({ ...media, ...value, media_type: value.media_type })
          .then(() => done("mediaUpdatedSuccessfully"), fail);
        return;
      }

      if (!file || !value.media_type) return;
      await upload
        .mutateAsync({ ...value, media_type: value.media_type, file })
        .then(() => done("mediaAddedSuccessfully"), fail);
    },
  });

  const applyFile = (next: File) => {
    const isHeic = HEIC.test(next.name);
    const isImage = next.type.startsWith("image/") && !isHeic;
    const isVideo = next.type.startsWith("video/");
    if (isHeic) return setErrorKey("heicNotSupportedConvertFirst");
    if (!isImage && !isVideo) return setErrorKey("onlyImageOrVideoAllowed");
    setErrorKey(null);
    choose({ file: next, previewUrl: isImage ? URL.createObjectURL(next) : null });
    form.setFieldValue("media_type", isImage ? "image" : "video");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>{editing ? t("edit") : t("addMedia")}</DialogTitle>
      </DialogHeader>

      <form.AppField name="species_name">
        {(field) => <field.TextField label={t("speciesName")} placeholder={t("speciesNamePlaceholder")} />}
      </form.AppField>
      <form.AppField name="media_type">
        {(field) => (
          <field.TextField
            label={t("type")}
            placeholder={t("select")}
            disabled={chosen !== null}
            options={[
              { value: "image", label: t("image") },
              { value: "video", label: t("video") },
            ]}
          />
        )}
      </form.AppField>
      {editing && (
        <form.AppField name="download_link">
          {(field) => <field.TextField label={t("mediaUrl")} placeholder={t("pasteUrl")} type="url" />}
        </form.AppField>
      )}
      <form.AppField name="alt_text">
        {(field) => <field.TextField label={t("altText")} placeholder={t("altTextPlaceholder")} />}
      </form.AppField>

      {!editing && (
        <Field>
          <FieldLabel>{t("file")}</FieldLabel>
          {chosen ? (
            <FilePreview chosen={chosen} onRemove={() => choose(null)} removeLabel={t("remove")} />
          ) : (
            <FileDropzone
              accept="image/*,video/*"
              onFile={applyFile}
              title={t("dragOrClickMedia")}
              dropTitle={t("dropMediaFile")}
              hint={t("imageOrVideoFileTypes")}
            />
          )}
        </Field>
      )}

      {errorKey && (
        <Alert variant="destructive" className="rounded-lg border-destructive/30 bg-destructive-soft py-2">
          <AlertDescription className="text-compact text-destructive">{t(errorKey)}</AlertDescription>
        </Alert>
      )}

      <form.Subscribe selector={(state) => [state.values, state.isSubmitting] as const}>
        {([values, isSubmitting]) => {
          const ready =
            Boolean(values.species_name.trim()) &&
            Boolean(values.media_type) &&
            (editing ? Boolean(values.download_link.trim()) : file !== null);
          return (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={!ready || isSubmitting}>
                {isSubmitting ? t("uploading") : t("save")}
              </Button>
            </DialogFooter>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

/** Add-media dialog (file upload) when `media` is null, edit dialog (URL and metadata) otherwise. */
export default function MediaDialog({ open, media, onClose }: MediaDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={t("close")} className="rounded-2xl sm:max-w-xl">
        {open && <MediaForm key={media?.media_id ?? "new"} media={media} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
