import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";

export default function TableLayout({
  rows = [],
  columns,
  loading = false,
  paginationModel = { page: 0, pageSize: 5 },
}: {
  rows: unknown[];
  columns: GridColDef[];
  loading?: boolean;
  paginationModel?: { page: number; pageSize: number };
}) {
  return (
    <Paper elevation={0} className="bg-white">
      <DataGrid
        loading={loading}
        rows={rows}
        columns={columns}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10]}
        // checkboxSelection
        disableRowSelectionOnClick
        disableRowSelectionExcludeModel
        sx={{
          border: "1px solid #d3d3d3",
          boxShadow: "none",
          borderRadius: "15px",
        }}
        className="border shadow-none border-gray-100 rounded-md px-4 py-2 mb-3 bg-white"
      />
    </Paper>
  );
}
