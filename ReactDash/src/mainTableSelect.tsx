import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import Paper from '@mui/material/Paper'
import { useEffect, useState } from "react"
import { translations } from './translations'

type Species = {
  species_id: number
  scientific_name: string
  common_name: string
  etymology: string
  definition?: string
  habitat: string
  identification_character: string
  leaf_type: string
  fruit_type: string
  phenology: string
  seed_germination: string
  pest: string
}

interface MainTableProps {
  onRowSelect: (rowData: Species | null) => void
  lang: "en" | "tet"
}

const paginationModel = { page: 0, pageSize: 10 }

export default function MainTableSelect({ onRowSelect, lang }: MainTableProps) {
  const t = translations[lang]
  const [speciesEn, setSpeciesEn] = useState<Species[]>([])

  const columns: GridColDef[] = [
    { field: 'species_id', headerName: t.id, width: 50 },
    { field: 'scientific_name', headerName: t.scientificName, width: 200 },
    { field: 'common_name', headerName: t.commonName, width: 150 },
    { field: 'etymology', headerName: t.etymology, width: 150 },
    { field: 'habitat', headerName: t.habitat, width: 130 },
    { field: 'identification_character', headerName: t.identificationCharacter, width: 150 },
    { field: 'leaf_type', headerName: t.leafType, width: 120 },
    { field: 'fruit_type', headerName: t.fruitType, width: 120 },
    { field: 'phenology', headerName: t.phenology, width: 120 },
    { field: 'seed_germination', headerName: t.seedGermination, width: 150 },
    { field: 'pest', headerName: t.pest, width: 130 },
  ]

  useEffect(() => {
    getSpecies()
  }, [])

  async function getSpecies() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/bundle`, {
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error("failed to fetch species")
      }

      const data = await res.json()
      setSpeciesEn(data.species_en ?? [])
    } catch (err) {
      console.error(err)
      setSpeciesEn([])
    }
  }

  const handleRowSelection = (selectionModel: any) => {
    const selectedIds = Array.from(selectionModel || [])

    if (selectedIds.length > 0) {
      const selectedId = selectedIds[0]
      const selectedSpecies = speciesEn.find(s => s.species_id === selectedId)
      onRowSelect(selectedSpecies || null)
    } else {
      onRowSelect(null)
    }
  }

  return (
    <Paper sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={speciesEn}
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

export type { Species }