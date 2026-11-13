import { useCallback } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl, requestJson, rootUrl } from "../../shared/api/apiClient";
import type { Lang } from "../../useLanguage";
import {
  fromTranslationOutput,
  toSpeciesPayload,
  toTranslationInput,
  type SpeciesFormValues,
  type SpeciesRecord,
  type SpeciesText,
} from "./species";

type SpeciesBundle = { species_en: SpeciesRecord[]; species_tet: SpeciesRecord[] };

const speciesKeys = { all: ["species"] as const, bundle: ["species", "bundle"] as const };

const bundleQuery = queryOptions({
  queryKey: speciesKeys.bundle,
  queryFn: () => requestJson<SpeciesBundle>(apiUrl("/bundle")),
});

const selectEnglish = (bundle: SpeciesBundle) => bundle.species_en ?? [];
const selectTetum = (bundle: SpeciesBundle) => bundle.species_tet ?? [];

/** Species records in one language, from the shared bundle query. */
export function useSpeciesList(lang: Lang) {
  return useQuery({ ...bundleQuery, select: lang === "tet" ? selectTetum : selectEnglish });
}

/** The English and Tetum records of one species. Either is undefined when its row is missing. */
export function useSpeciesPair(speciesId: number | null) {
  const select = useCallback(
    (bundle: SpeciesBundle) => ({
      en: bundle.species_en?.find((row) => row.species_id === speciesId),
      tet: bundle.species_tet?.find((row) => row.species_id === speciesId),
    }),
    [speciesId]
  );
  return useQuery({ ...bundleQuery, select, enabled: speciesId !== null });
}

function useSpeciesMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: speciesKeys.all });
    },
  });
}

export const useCreateSpecies = () =>
  useSpeciesMutation((values: SpeciesFormValues) =>
    requestJson(rootUrl("/species"), { method: "POST", json: toSpeciesPayload(values) })
  );

export const useUpdateSpecies = (speciesId: number) =>
  useSpeciesMutation((values: SpeciesFormValues) =>
    requestJson(apiUrl(`/species/${speciesId}`), { method: "PUT", json: toSpeciesPayload(values) })
  );

export const useDeleteSpecies = () =>
  useSpeciesMutation((speciesId: number) =>
    requestJson(apiUrl(`/species/${speciesId}`), { method: "DELETE" })
  );

export const useImportSpreadsheet = () =>
  useSpeciesMutation((file: File) => {
    const form = new FormData();
    form.append("file", file);
    return requestJson(rootUrl("/upload-species"), { method: "POST", form });
  });

export const useTranslateToTetum = () =>
  useMutation({
    mutationFn: async (english: SpeciesText) =>
      fromTranslationOutput(
        await requestJson<string[]>(rootUrl("/translate"), {
          method: "POST",
          json: { text: toTranslationInput(english) },
        })
      ),
  });
