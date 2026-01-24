// species pages
import type { GridColDef } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import TableLayout from "../Components/TableLayout";
import UploadFileIcon from "@mui/icons-material/UploadFile";

const apiUrl = import.meta.env.VITE_API_URL;

export default function SpeciesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchSpecies() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/bundle`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || res.statusText);
      }

      const data = await res.json();
      console.log("Fetched species data:", data);
      const mainData = data.species_en.map((item: any) => ({
        id: item.species_id,
        ...item,
      }));
      setRows(mainData);
    } catch (e) {
      // const errorMsg =
      //   e instanceof Error ? e.message : "Network error fetching users";
      // showSnackbar(errorMsg, "error");
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSpecies();
  }, []);

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      //width full length
    },
    { field: "common_name", headerName: "Species Name", width: 170 },
    // { field: "etymology", headerName: "Etymology" },
    // { field: "fruit_type", headerName: "Fruit Type" },
    { field: "scientific_name", headerName: "Scientific Name", width: 150 },
    // { field: "leaf_type", headerName: "Leaf Type" },
    {
      field: "identification_character",
      headerName: "Identification Character",
      width: 150,
    },
    // { field: "pest", headerName: "Pest", width: 130 },
    // { field: "phenology", headerName: "Phenology", width: 130 },
    // { field: "seed_germination", headerName: "Seed Germination", width: 130 },
    { field: "habitat", headerName: "Habitat", width: 130 },

    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      minWidth: 100,
      renderCell: (params) => {
        return (
          <div style={{ display: "flex", gap: 12 }}>
            <Link
              style={{
                color: "#4E8A16",
              }}
              to={`/edit/${params.id}`}
            >
              Edit
            </Link>
            <Link
              style={{
                color: "#4E8A16",
              }}
              to={`/delete/${params.id}`}
            >
              Delete
            </Link>
          </div>
        );
      },
    },
  ];

  // const rows = [
  //   { id: 1, lastName: "Snow", speciesName: "Jon", age: 35 },
  //   { id: 2, lastName: "Lannister", speciesName: "Cersei", age: 42 },
  //   { id: 3, lastName: "Lannister", speciesName: "Jaime", age: 45 },
  //   { id: 4, lastName: "Stark", speciesName: "Arya", age: 16 },
  //   { id: 5, lastName: "Targaryen", speciesName: "Daenerys", age: null },
  //   { id: 6, lastName: "Melisandre", speciesName: null, age: 150 },
  //   { id: 7, lastName: "Clifford", speciesName: "Ferrara", age: 44 },
  //   { id: 8, lastName: "Frances", speciesName: "Rossini", age: 36 },
  //   { id: 9, lastName: "Roxie", speciesName: "Harvey", age: 65 },
  // ];
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-3xl font-bold">Species Page</h2>
        <div style={{display:"flex", gap: 12}}>
          <Button
            component={Link}
            to="/Page1"
            variant="contained"
            className="hover:!text-white hover:!shadow-lg hover:!bg-[#3b6910]"
            style={{
              backgroundColor: "#4E8A16",
              borderRadius: "8px",
              boxShadow: "none",
              textTransform: "none",
            }}
            startIcon={<AddIcon />}
          >
            Add Species
          </Button>
          <Button
            component={Link}
            to="/AddExcel"
            variant="contained"
            className="hover:!text-white hover:!shadow-lg hover:!bg-[#3b6910]"
            style={{
              backgroundColor: "#4E8A16",
              borderRadius: "8px",
              boxShadow: "none",
              textTransform: "none",
            }}
            startIcon={<UploadFileIcon />}
          >
            Upload Excel
          </Button>

        </div>
      </div>
      <div className="w-full overflow-hidden">
        <TableLayout loading={loading} rows={rows} columns={columns} />
      </div>
    </div>
  );
}
