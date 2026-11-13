import type { ReactNode } from "react";
import { Button } from "@sda/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@sda/ui/components/dialog";
import { useLanguage } from "../../useLanguage";
import { useResolvedImage } from "./api";
import { youtubeId, type Media } from "./media";
import { TypeBadge } from "./MediaVisuals";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 text-compact">
      <strong className="min-w-20 shrink-0 text-brand-text">{label}:</strong>
      {children}
    </div>
  );
}

export default function MediaPreviewDialog({ media, onClose }: { media: Media | null; onClose: () => void }) {
  const { t } = useLanguage();
  const isVideo = media?.media_type === "video";
  const videoId = isVideo && media ? youtubeId(media.download_link) : null;
  const image = useResolvedImage(media?.download_link ?? "", Boolean(media) && !isVideo);

  const stage = isVideo ? (
    videoId ? (
      <iframe
        className="size-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={media?.species_name}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <span className="text-compact text-faint">{t("previewNotAvailable")}</span>
    )
  ) : image.pending ? (
    <span className="text-compact text-faint">{t("loadingImage")}</span>
  ) : image.failed || !image.url ? (
    <span className="text-compact text-destructive/60">{t("noImageFound")}</span>
  ) : (
    <img src={image.url} alt={media?.alt_text || media?.species_name} className="max-h-full max-w-full object-contain" />
  );

  return (
    <Dialog open={Boolean(media)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={t("close")} className="rounded-2xl bg-background sm:max-w-3xl">
        {media && (
          <>
            <DialogHeader className="flex-row items-center justify-between gap-3 pr-8">
              <DialogTitle className="italic">{media.species_name || t("untitled")}</DialogTitle>
              <TypeBadge type={media.media_type} />
            </DialogHeader>
            <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black">
              {stage}
            </div>
            <div className="flex flex-col gap-2">
              <Detail label={t("mediaUrl")}>
                <a href={media.download_link} target="_blank" rel="noopener noreferrer" className="break-all text-primary">
                  {media.download_link}
                </a>
              </Detail>
              {media.alt_text && (
                <Detail label={t("altText")}>
                  <span className="text-body">{media.alt_text}</span>
                </Detail>
              )}
              <Detail label={t("id")}>
                <span className="text-body">{media.media_id}</span>
              </Detail>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("close")}</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
