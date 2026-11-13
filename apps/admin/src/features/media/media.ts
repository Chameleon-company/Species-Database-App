export type MediaType = "image" | "video";

export type Media = {
  media_id: number;
  species_name: string;
  media_type: MediaType | string;
  download_link: string;
  alt_text?: string | null;
};

export const looksLikeDirectImage = (url: string) => /\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(url);

/** True for a well-formed absolute http or https URL. */
export function isValidUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value.trim());
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** The 11-character video ID from youtu.be, watch, embed and shorts URLs, or null. */
export function youtubeId(url: string): string | null {
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)?.[1] ?? null;
}

export const youtubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
