import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@sda/ui/components/skeleton";
import { ApiError } from "../../shared/api/apiClient";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import LoadError from "../../shared/ui/LoadError";
import Page from "../../shared/ui/Page";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useCreateSpecies, useDeleteSpecies, useSpeciesPair, useUpdateSpecies } from "./api";
import SpeciesForm from "./SpeciesForm";
import { emptySpeciesForm, toSpeciesText, type SpeciesFormValues } from "./species";

const messageOf = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.message ? error.message : fallback;

export default function SpeciesFormPage() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const speciesId = id ? Number(id) : null;

  const pair = useSpeciesPair(speciesId);
  const createSpecies = useCreateSpecies();
  const updateSpecies = useUpdateSpecies(speciesId ?? 0);
  const deleteSpecies = useDeleteSpecies();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (speciesId === null) {
    const create = (values: SpeciesFormValues) =>
      createSpecies.mutateAsync(values).then(
        () => {
          toast.success(t("uploadSuccessful"));
          navigate("/species");
        },
        (error) => toast.error(messageOf(error, t("databaseUploadFailed")))
      );

    return (
      <Page title={t("addSpecies")}>
        <SpeciesForm mode="create" initialValues={emptySpeciesForm()} onSubmit={create} />
      </Page>
    );
  }

  const english = pair.data?.en;
  const update = (values: SpeciesFormValues) =>
    updateSpecies.mutateAsync(values).then(
      () => {
        toast.success(t("speciesUpdatedSuccessfully"));
        navigate("/species");
      },
      (error) => toast.error(messageOf(error, t("databaseUploadFailed")))
    );

  const remove = () =>
    deleteSpecies.mutate(speciesId, {
      onSuccess: () => {
        toast.success(t("speciesDeletedSuccessfully"));
        navigate("/species");
      },
      onError: (error) => {
        setConfirmDelete(false);
        toast.error(messageOf(error, t("failedToDeleteSpecies")));
      },
    });

  return (
    <Page title={t("editExistingEntry")}>
      {pair.isPending || deleteSpecies.isPending || deleteSpecies.isSuccess ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : pair.isError || !english ? (
        <LoadError onRetry={() => pair.refetch()}>{t("failedToLoadSpecies")}</LoadError>
      ) : (
        <SpeciesForm
          key={speciesId}
          mode="edit"
          initialValues={{ en: toSpeciesText(english), tet: toSpeciesText(pair.data.tet) }}
          onSubmit={update}
          onDelete={() => setConfirmDelete(true)}
          deleting={deleteSpecies.isPending}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={t("deleteSpeciesEntry")}
        confirmLabel={t("delete")}
        pending={deleteSpecies.isPending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      >
        {t("deleteConfirmPrefix")} <strong className="text-foreground">{english?.common_name}</strong>?{" "}
        {t("deleteConfirmSuffix")}
      </ConfirmDialog>
    </Page>
  );
}
