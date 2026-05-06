import { useEffect, useState } from "react";
import { DataGrid, GridActionsCellItem, GridRowModes } from "@mui/x-data-grid";
import type {
  GridColDef,
  GridRowModesModel,
  GridRowId,
} from "@mui/x-data-grid";
import { Stack, Button, Alert, Snackbar } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import { adminFetch } from "../utils/adminFetch";
import { translations } from "../translations";

const API_BASE = import.meta.env.VITE_API_URL;

export interface User {
  user_id: number;
  name: string;
  role: string;
  is_active: boolean;
  auth_provider: "local" | "google";
  created_at?: string;
  password?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
}

export default function Users() {
  const [lang, setLang] = useState<"en" | "tet">(
    (localStorage.getItem("lang") as "en" | "tet") || "en"
  );
  const t = (key: string) =>
    (translations as any)[key]?.[lang] || key;

  const changeLang = (newLang: "en" | "tet") => {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  };

  const [rows, setRows] = useState<User[]>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "info",
  });

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await adminFetch(`${API_BASE}/users`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }

      const data: User[] = await res.json();
      setRows(data);
    } catch (e) {
      const errorMsg =
      e instanceof Error ? e.message : t("networkErrorFetchingUsers");
      showSnackbar(errorMsg, "error");
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = () => {
    const tempId = -Date.now();

    const newUser: User = {
      user_id: tempId,
      name: "",
      role: "",
      is_active: true,
      auth_provider: "local",
      password: "",
    };

    setRows((prev) => [newUser, ...prev]);

    setRowModesModel((prev) => ({
      ...prev,
      [tempId]: { mode: GridRowModes.Edit, fieldToFocus: "name" },
    }));
  };

  const handleSave = async (id: GridRowId) => {
    setRowModesModel((prev) => ({
      ...prev,
      [id]: { mode: GridRowModes.View },
    }));
  };

  const handleSaveActual = async (user: User) => {
    const numericId = user.user_id;
    const isNew = numericId < 0;

    if (!user.name?.trim()) {
      showSnackbar(t("nameRequired"), "error");
      return;
    }

    if (!user.role?.trim()) {
      showSnackbar(t("roleRequired"), "error");
      return;
    }

    if (isNew && user.auth_provider === "local" && !user.password?.trim()) {
      showSnackbar(t("passwordRequiredForNewLocalUsers"), "error");
      return;
    }

    const url = isNew ? `${API_BASE}/users` : `${API_BASE}/users/${numericId}`;

    const payload: any = {
      name: user.name.trim(),
      role: user.role.trim(),
      is_active: user.is_active,
      auth_provider: user.auth_provider,
    };

    if (user.auth_provider === "local" && user.password?.trim()) {
      payload.password = user.password;
    }

    setLoading(true);
    try {
      const res = await adminFetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }

      showSnackbar(
        isNew ? t("userCreatedSuccessfully") : t("userUpdatedSuccessfully"),
        "success"
      );

      await fetchUsers();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : t("failedToSaveUser");
      showSnackbar(errorMsg, "error");
      console.error("Save error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: GridRowId) => {
    setRowModesModel((prev) => ({
      ...prev,
      [id]: { mode: GridRowModes.Edit },
    }));
  };

  const handleDelete = async (id: GridRowId) => {
    const numericId = Number(id);
    const user = rows.find((r) => r.user_id === numericId);

    if (!user) return;

    const confirmed = window.confirm(
      `${t("areYouSureDeleteUser")} "${user.name}"?`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await adminFetch(`${API_BASE}/users/${numericId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }

      setRows((prev) => prev.filter((r) => r.user_id !== numericId));
      showSnackbar(t("userDeletedSuccessfully"), "success");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : t("failedToDeleteUser");
      showSnackbar(errorMsg, "error");
      console.error("Delete error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (id: GridRowId) => {
    const numericId = Number(id);

    setRowModesModel((prev) => ({
      ...prev,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    }));

    if (numericId < 0) {
      setRows((prev) => prev.filter((r) => r.user_id !== numericId));
    }
  };

  const processRowUpdate = async (newRow: User) => {
    setRows((prev) =>
      prev.map((row) => (row.user_id === newRow.user_id ? newRow : row))
    );

    await handleSaveActual(newRow);

    return newRow;
  };

  const columns: GridColDef[] = [
    {
      field: "user_id",
      headerName: t("id"),
      width: 80,
      valueGetter: (params) => (params < 0 ? t("new") : params),
    },
    {
      field: "name",
      headerName: t("name"),
      width: 200,
      editable: true,
    },
    {
      field: "role",
      headerName: t("role"),
      width: 150,
      editable: true,
    },
    {
      field: "password",
      headerName: t("password"),
      width: 180,
      editable: true,
      renderCell: (params) => {
        const isNewRow = params.row.user_id < 0;
        const isEditMode =
          rowModesModel[params.row.user_id]?.mode === GridRowModes.Edit;

        if (isNewRow || (isEditMode && params.value)) {
          return params.value || "";
        }
        return "••••••••";
      },
    },
    {
      field: "is_active",
      headerName: t("active"),
      type: "boolean",
      width: 100,
      editable: true,
    },
    {
      field: "auth_provider",
      headerName: t("auth"),
      width: 140,
      type: "singleSelect",
      valueOptions: ["local", "google"],
      editable: true,
      valueFormatter: (value) =>
        value === "google" ? t("google") : t("local"),
    },
    {
      field: "created_at",
      headerName: t("created"),
      width: 180,
      valueGetter: (params) => {
        if (!params) return "";
        const date = new Date(params);
        return date.toLocaleString();
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions"),
      width: 120,
      getActions: ({ id }) => {
        const isEditing = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isEditing) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label={t("save")}
              onClick={() => handleSave(id)}
              disabled={loading}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label={t("cancel")}
              onClick={() => handleCancel(id)}
              disabled={loading}
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label={t("edit")}
            onClick={() => handleEdit(id)}
            disabled={loading}
          />,
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label={t("delete")}
            onClick={() => handleDelete(id)}
            disabled={loading}
          />,
        ];
      },
    },
  ];

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <h2 className="text-3xl font-bold" style={{ margin: 0 }}>
        {t("userManagement")}
        </h2>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => changeLang("en")} style={{ marginRight: "10px" }}>
            EN
          </button>
          <button onClick={() => changeLang("tet")}>TET</button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={loading}
          >
            {t("createUser")}
          </Button>
        </div>
      </Stack>

      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.user_id}
        editMode="row"
        rowModesModel={rowModesModel}
        onRowModesModelChange={setRowModesModel}
        processRowUpdate={processRowUpdate}
        loading={loading}
        pageSizeOptions={[10, 20, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        sx={{
          backgroundColor: "#fff",
          "& .MuiDataGrid-row--editing": {
            backgroundColor: "#f5f5f5",
          },
        }}
        disableRowSelectionOnClick
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}