import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@sda/ui/components/button";
import { DataTable } from "@sda/ui/components/data-table";
import { dataTableColumnHelper } from "@sda/ui/lib/data-table";
import { ApiError } from "../../shared/api/apiClient";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import LoadError from "../../shared/ui/LoadError";
import Page from "../../shared/ui/Page";
import { useTableText } from "../../shared/ui/useTableText";
import { useLanguage } from "../../useLanguage";
import { useDeleteUser, useUsers, type User } from "./api";
import UserDialog from "./UserDialog";

const column = dataTableColumnHelper<User>();
const NO_USERS: User[] = [];

export default function UsersPage() {
  const { t } = useLanguage();
  const { emptyLabel, labels } = useTableText();

  const users = useUsers();
  const deleteUser = useDeleteUser();
  const [dialog, setDialog] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [toDelete, setToDelete] = useState<User | null>(null);

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteUser.mutate(toDelete.user_id, {
      onSuccess: () => toast.success(t("userDeletedSuccessfully")),
      onError: (error) =>
        toast.error(error instanceof ApiError && error.message ? error.message : t("failedToDeleteUser")),
      onSettled: () => setToDelete(null),
    });
  };

  const columns = column.columns([
    column.accessor("user_id", { header: t("id"), meta: { className: "w-20" } }),
    column.accessor("name", { header: t("name"), meta: { className: "min-w-50" } }),
    column.accessor("role", { header: t("role"), meta: { className: "min-w-37" } }),
    column.display({
      id: "password",
      header: t("password"),
      cell: () => <span aria-hidden="true">••••••••</span>,
      meta: { className: "min-w-45" },
    }),
    column.accessor("is_active", {
      header: t("active"),
      cell: ({ getValue }) =>
        getValue() ? (
          <Check aria-label={t("active")} className="size-4.5 text-body" />
        ) : (
          <X aria-label={t("inactive")} className="size-4.5 text-faint" />
        ),
      meta: { className: "w-25" },
    }),
    column.accessor("auth_provider", {
      header: t("auth"),
      cell: ({ getValue }) => (getValue() === "google" ? t("google") : t("local")),
      meta: { className: "w-35" },
    }),
    column.accessor((row) => row.created_at ?? "", {
      id: "created_at",
      header: t("created"),
      cell: ({ getValue }) => (getValue() ? new Date(getValue()).toLocaleString() : ""),
      meta: { className: "min-w-45" },
    }),
    column.display({
      id: "actions",
      header: t("actions"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("edit")}
            className="text-icon hover:bg-accent hover:text-primary"
            onClick={() => setDialog({ open: true, user: row.original })}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("delete")}
            className="text-icon hover:bg-destructive-soft hover:text-destructive"
            onClick={() => setToDelete(row.original)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
      meta: { className: "w-30" },
    }),
  ]);

  return (
    <Page
      title={t("userManagement")}
      actions={
        <Button onClick={() => setDialog({ open: true, user: null })} disabled={users.isPending}>
          <Plus />
          {t("createUser")}
        </Button>
      }
    >
      {users.isError ? (
        <LoadError onRetry={() => users.refetch()}>
          {users.error instanceof ApiError && users.error.message ? users.error.message : t("networkErrorFetchingUsers")}
        </LoadError>
      ) : (
        <DataTable
          columns={columns}
          data={users.data ?? NO_USERS}
          getRowId={(row) => String(row.user_id)}
          loading={users.isPending}
          emptyLabel={emptyLabel}
          labels={labels}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      <UserDialog open={dialog.open} user={dialog.user} onClose={() => setDialog({ open: false, user: null })} />
      <ConfirmDialog
        open={toDelete !== null}
        title={t("delete")}
        confirmLabel={t("delete")}
        pending={deleteUser.isPending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        {t("areYouSureDeleteUser")} <strong className="text-foreground">"{toDelete?.name}"</strong>?
      </ConfirmDialog>
    </Page>
  );
}
