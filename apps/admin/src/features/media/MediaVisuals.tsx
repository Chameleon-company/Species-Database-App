import { useState } from "react";
import { Image as ImageIcon, ImageOff, Play, Video } from "lucide-react";
import { Badge } from "@sda/ui/components/badge";
import { Spinner } from "@sda/ui/components/spinner";
import { cn } from "@sda/ui/lib/utils";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useResolvedImage } from "./api";
import { youtubeId, youtubeThumbnail, type Media } from "./media";

export function TypeBadge({ type }: { type: string }) {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const isImage = type === "image";

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5.5 gap-1 rounded-full px-2 text-label uppercase",
        isImage ? "border-brand-chip bg-muted text-primary" : "border-info-border bg-info-soft text-info"
      )}
    >
      {isImage ? <ImageIcon /> : <Video />}
      {isImage ? t("image") : t("video")}
    </Badge>
  );
}

const tileClass = "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border";

/** 64 px preview tile. Clicking it opens the media preview. */
export function MediaThumb({ media, onPreview }: { media: Media; onPreview: () => void }) {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const isVideo = media.media_type === "video";
  const image = useResolvedImage(media.download_link, !isVideo);
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!media.download_link || !media.media_type) {
    return (
      <div className={cn(tileClass, "flex-col gap-0.5 border-dashed border-faint bg-muted text-label font-normal tracking-normal text-faint")}>
        <ImageIcon className="size-4.5" />
        {t("noMedia")}
      </div>
    );
  }

  if (isVideo) {
    const id = youtubeId(media.download_link);
    return (
      <button type="button" onClick={onPreview} aria-label={t("mediaPreview")} className={cn(tileClass, "relative bg-foreground transition-transform hover:scale-108")}>
        {id ? (
          <img src={youtubeThumbnail(id)} alt={t("mediaPreview")} className="size-full object-cover" />
        ) : (
          <Video className="size-5.5 text-brand-accent" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/15">
          <span className="flex size-6 items-center justify-center rounded-full bg-black/55">
            <Play className="size-3.5 fill-white text-white" />
          </span>
        </span>
      </button>
    );
  }

  if (image.pending) {
    return (
      <div className={cn(tileClass, "bg-muted")}>
        <Spinner className="text-brand-accent" />
      </div>
    );
  }

  if (image.failed || !image.url || broken) {
    return (
      <button
        type="button"
        title={t("retry")}
        onClick={() => {
          setBroken(false);
          setAttempt((count) => count + 1);
          image.retry();
        }}
        className={cn(tileClass, "flex-col gap-0.5 border-dashed border-destructive/40 bg-destructive-soft p-1 text-center text-label leading-tight font-normal tracking-normal text-destructive hover:bg-destructive/15")}
      >
        <ImageOff className="size-4" />
        {t("noImageFound")}
      </button>
    );
  }

  return (
    <button type="button" onClick={onPreview} aria-label={t("mediaPreview")} className={cn(tileClass, "cursor-zoom-in transition-transform hover:scale-108")}>
      <img key={attempt} src={image.url} alt={media.alt_text || t("mediaPreview")} onError={() => setBroken(true)} className="size-full object-cover" />
    </button>
  );
}
