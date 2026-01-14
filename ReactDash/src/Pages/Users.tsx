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

const API_BASE = "http://127.0.0.1:5000/api";

export interface User {
  user_id: number;
  name: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  password?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
}

export default function Users() {
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
      const res = await fetch(`${API_BASE}/users`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }

      const data: User[] = await res.json();
      setRows(data);
    } catch (e) {
      const errorMsg =
        e instanceof Error ? e.message : "Network error fetching users";
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
    const tempId = -Date.now(); // Use negative IDs for new rows

    const newUser: User = {
      user_id: tempId,
      name: "",
      role: "",
      is_active: true,
      password: "",
    };

    setRows((prev) => [newUser, ...prev]);

    setRowModesModel((prev) => ({
      ...prev,
      [tempId]: { mode: GridRowModes.Edit, fieldToFocus: "name" },
    }));
  };

  const handleSave = async (id: GridRowId) => {
    // First, exit edit mode to trigger processRowUpdate
    setRowModesModel((prev) => ({
      ...prev,
      [id]: { mode: GridRowModes.View },
    }));
  };

  const handleSaveActual = async (user: User) => {
    const numericId = user.user_id;
    const isNew = numericId < 0;

    // Validation
    if (!user.name?.trim()) {
      showSnackbar("Name is required", "error");
      return;
    }

    if (!user.role?.trim()) {
      showSnackbar("Role is required", "error");
      return;
    }

    if (isNew && !user.password?.trim()) {
      showSnackbar("Password is required for new users", "error");
      return;
    }

    const url = isNew ? `${API_BASE}/users` : `${API_BASE}/users/${numericId}`;

    const payload: any = {
      name: user.name.trim(),
      role: user.role.trim(),
      is_active: user.is_active,
    };

    if (user.password?.trim()) {
      payload.password = user.password;
    }

    setLoading(true);
    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }

      showSnackbar(
        isNew ? "User created successfully" : "User updated successfully",
        "success"
      );

      // Refresh the list to get the actual user_id from the server
      await fetchUsers();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to save user";
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
      `Are you sure you want to delete user "${user.name}"?`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${numericId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }

      setRows((prev) => prev.filter((r) => r.user_id !== numericId));
      showSnackbar("User deleted successfully", "success");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to delete user";
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

    // Remove temporary rows
    if (numericId < 0) {
      setRows((prev) => prev.filter((r) => r.user_id !== numericId));
    }
  };

  const processRowUpdate = async (newRow: User) => {
    // Update local state
    setRows((prev) =>
      prev.map((row) => (row.user_id === newRow.user_id ? newRow : row))
    );

    // Trigger the actual save
    await handleSaveActual(newRow);

    return newRow;
  };

  const columns: GridColDef[] = [
    {
      field: "user_id",
      headerName: "ID",
      width: 80,
      valueGetter: (params) => (params < 0 ? "New" : params),
    },
    {
      field: "name",
      headerName: "Name",
      width: 200,
      editable: true,
    },
    {
      field: "role",
      headerName: "Role",
      width: 150,
      editable: true,
    },
    {
      field: "password",
      headerName: "Password",
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
      headerName: "Active",
      type: "boolean",
      width: 100,
      editable: true,
    },
    {
      field: "created_at",
      headerName: "Created",
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
      headerName: "Actions",
      width: 120,
      getActions: ({ id }) => {
        const isEditing = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isEditing) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              onClick={() => handleSave(id)}
              disabled={loading}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              onClick={() => handleCancel(id)}
              disabled={loading}
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEdit(id)}
            disabled={loading}
          />,
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
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
        <h2 style={{ margin: 0 }}>User Management</h2>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={loading}
        >
          Create User
        </Button>
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
