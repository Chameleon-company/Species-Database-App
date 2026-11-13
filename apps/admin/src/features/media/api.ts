import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson, rootUrl } from "../../shared/api/apiClient";
import { looksLikeDirectImage, type Media, type MediaType } from "./media";

const mediaKeys = {
  all: ["media"] as const,
  list: ["media", "list"] as const,
  resolved: (url: string) => ["media", "resolved", url] as const,
};

export const mediaListQuery = queryOptions({
  queryKey: mediaKeys.list,
  queryFn: async () => {
    const data = await requestJson<Media[]>(rootUrl("/upload-media"));
    return Array.isArray(data) ? data : [];
  },
});

export const useMediaList = () => useQuery(mediaListQuery);

/**
 * Displayable image URL for a media link. Direct image links pass through;
 * other pages go through the API's resolver once and stay cached.
 */
export function useResolvedImage(url: string, enabled: boolean) {
  const direct = looksLikeDirectImage(url);
  const resolved = useQuery({
    queryKey: mediaKeys.resolved(url),
    queryFn: async () =>
      (await requestJson<{ resolved_url: string }>(rootUrl(`/api/resolve-image?url=${encodeURIComponent(url)}`)))
        .resolved_url,
    enabled: enabled && Boolean(url) && !direct,
    staleTime: Infinity,
  });

  if (!enabled || !url) return { url: null, pending: false, failed: false };
  if (direct) return { url, pending: false, failed: false };
  return { url: resolved.data ?? null, pending: resolved.isPending, failed: resolved.isError };
}

function useMediaMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaKeys.list }),
  });
}

export type NewMedia = { species_name: string; media_type: MediaType; alt_text: string; file: File };

export const useUploadMedia = () =>
  useMediaMutation(({ species_name, media_type, alt_text, file }: NewMedia) => {
    const form = new FormData();
    form.append("file", file);
    form.append("species_name", species_name.trim());
    form.append("media_type", media_type);
    form.append("alt_text", alt_text.trim());
    return requestJson(rootUrl("/upload-media/file"), { method: "POST", form });
  });

export const useUpdateMedia = () =>
  useMediaMutation((media: Media) =>
    requestJson(rootUrl(`/upload-media/${media.media_id}`), { method: "PUT", json: media })
  );

export const useDeleteMedia = () =>
  useMediaMutation((mediaId: number) => requestJson(rootUrl(`/upload-media/${mediaId}`), { method: "DELETE" }));
