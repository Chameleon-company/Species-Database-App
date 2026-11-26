import type { Tables } from "./database.ts";

export type MediaType = "image" | "video";

/**
 * A `media` row, with `media_type` narrowed to the values that `media_media_type_check` allows.
 * The narrowing is written by hand. Change it with the constraint in TableSchema.sql.
 */
export type Media = Omit<Tables<"media">, "media_type"> & { media_type: MediaType | null };
