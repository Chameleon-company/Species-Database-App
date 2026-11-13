import { toast } from "sonner";
import { Button } from "@sda/ui/components/button";
import { Checkbox } from "@sda/ui/components/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@sda/ui/components/dialog";
import { Field, FieldLabel } from "@sda/ui/components/field";
import { ApiError } from "../../shared/api/apiClient";
import { required, useAppForm } from "../../shared/form/useAppForm";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useSaveUser, type User, type UserInput } from "./api";

type UserDialogProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
};

function UserForm({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const saveUser = useSaveUser();
  const isNew = user === null;

  const form = useAppForm({
    defaultValues: {
      name: user?.name ?? "",
      role: user?.role ?? "",
      is_active: user?.is_active ?? true,
      auth_provider: user?.auth_provider ?? "local",
      password: "",
    } as UserInput,
    onSubmit: ({ value }) =>
      saveUser.mutateAsync({ userId: user?.user_id ?? null, input: value }).then(
        () => {
          toast.success(t(isNew ? "userCreatedSuccessfully" : "userUpdatedSuccessfully"));
          onClose();
        },
        (error) =>
          toast.error(error instanceof ApiError && error.message ? error.message : t("failedToSaveUser"))
      ),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>{isNew ? t("createUser") : t("edit")}</DialogTitle>
      </DialogHeader>

      <form.AppField name="name" validators={{ onChange: required("nameRequired") }}>
        {(field) => <field.TextField label={t("name")} required autoComplete="off" />}
      </form.AppField>
      <form.AppField name="role" validators={{ onChange: required("roleRequired") }}>
        {(field) => <field.TextField label={t("role")} required />}
      </form.AppField>
      <form.AppField name="auth_provider">
        {(field) => (
          <field.TextField
            label={t("auth")}
            options={[
              { value: "local", label: t("local") },
              { value: "google", label: t("google") },
            ]}
          />
        )}
      </form.AppField>
      <form.Subscribe selector={(state) => state.values.auth_provider}>
        {(authProvider) =>
          authProvider === "local" && (
            <form.AppField
              name="password"
              validators={{
                onChange: ({ value }) =>
                  isNew && !value.trim() ? "passwordRequiredForNewLocalUsers" : undefined,
              }}
            >
              {(field) => (
                <field.TextField label={t("password")} type="password" required={isNew} autoComplete="new-password" />
              )}
            </form.AppField>
          )
        }
      </form.Subscribe>
      <form.Field name="is_active">
        {(field) => (
          <Field orientation="horizontal">
            <Checkbox
              id="is_active"
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked === true)}
            />
            <FieldLabel htmlFor="is_active" className="font-normal">
              {t("active")}
            </FieldLabel>
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t("save")}
            </Button>
          </DialogFooter>
        )}
      </form.Subscribe>
    </form>
  );
}

/** Create dialog when `user` is null, edit dialog otherwise. */
export default function UserDialog({ open, user, onClose }: UserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        {open && <UserForm key={user?.user_id ?? "new"} user={user} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
