import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import Paper from '@mui/material/Paper'
import { useEffect, useState } from "react"
import Box from '@mui/material/Box'
import {supabase, supabaseTetum} from './supabaseClient'






type Species = {
  species_id: number
  scientific_name: string
  common_name: string
  etymology: string
  habitat: string
  identification_character: string
  leaf_type: string
  fruit_type: string
  phenology: string
  seed_germination: string
  pest: string

}

const columns: GridColDef[] = [
  { field: 'species_id', headerName: 'ID', width: 50 },
  { field: 'scientific_name', headerName: 'Scientific Name', width: 200 },
  { field: 'common_name', headerName: 'Common Name', width: 150 },
  { field: 'etymology', headerName: 'Etymology', width: 150 },
  { field: 'habitat', headerName: 'Habitat', width: 130 },
  { field: 'identification_character', headerName: 'ID Character', width: 150 },
  { field: 'leaf_type', headerName: 'Leaf Type', width: 120 },
  { field: 'fruit_type', headerName: 'Fruit Type', width: 120 },
  { field: 'phenology', headerName: 'Phenology', width: 120 },
  { field: 'seed_germination', headerName: 'Seed Germination', width: 150 },
  { field: 'pest', headerName: 'Pest', width: 130 },
]

interface MainTableProps {
  onRowSelect: (rowData: Species | null) => void
}

const paginationModel = { page: 0, pageSize: 10 }



export default function MainTableSelect({ onRowSelect }: MainTableProps) {
      if (!supabase || !supabaseTetum) {
        return (
          <Box sx={{ marginTop: 10}}>
            <h2 style={{ color: 'red' }}>Critical Error: Database not accessible!</h2>
          </Box>
        )
      }

  if (true) {
      
    const [species, setSpecies] = useState<Species[]>([])
    useEffect(() => {
      getSpecies()
    }, [])

    async function getSpecies() {
      if (!supabase) { throw new Error('Failed to get rows to display'); }
      const { data } = await supabase.from("species_en").select()
      setSpecies(data ?? [])
    }

    const handleRowSelection = (selectionModel: any) => {
      console.log("Selection model:", selectionModel)

      const selectedIds = Array.from(selectionModel.ids || [])
      console.log("Selected IDs:", selectedIds)

      if (selectedIds.length > 0) {
        const selectedId = selectedIds[0]
        console.log("Selected ID:", selectedId)
        const selectedSpecies = species.find(s => s.species_id === selectedId)
        console.log("Found species:", selectedSpecies)
        onRowSelect(selectedSpecies || null)
      } else {
        onRowSelect(null)
      }



    }



    return (
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={species}
          columns={columns}
          getRowId={(row) => row.species_id}
          initialState={{ 
            pagination: { paginationModel },
            sorting: {
              sortModel: [{ field: 'species_id', sort: 'asc' }]
            }
          }}
          pageSizeOptions={[10, 20]}
          checkboxSelection
          disableMultipleRowSelection
          onRowSelectionModelChange={handleRowSelection}
          sx={{ border: 0, backgroundColor: '#cdcdcdff' }}
        />
      </Paper>
    )
  }

}
  

export type {Species}