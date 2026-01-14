import TheDrawer from '../Components/drawer'
import MainTableSelect from '../mainTableSelect'
import MainTableSelectTetum from '../mainTableSelectTetum'
import { useState } from 'react'
import type { Species } from '../mainTableSelect'
import Box from '@mui/material/Box'
import { TextField } from '@mui/material'



export function Home() {



    const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
    const [selectedSpeciesTetum, setSelectedSpeciesTetum] = useState<Species | null>(null)

    const handleRowSelect = (rowData: Species | null) => {
        setSelectedSpecies(rowData)
    }

    const handleRowSelectTetum = (rowData: Species | null) => {
        setSelectedSpeciesTetum(rowData)
    }

    const formatSpeciesData = (species: Species | null) => {
        if (!species) return ''
        
        return [
            `ID: ${species.species_id}`,
            `Scientific Name: ${species.scientific_name}`,
            `Common Name: ${species.common_name}`,
            `Leaf Type: ${species.leaf_type}`,
            `Fruit Type: ${species.fruit_type}`,
            `Etymology: ${species.etymology || 'N/A'}`,
            `Habitat: ${species.habitat || 'N/A'}`,
            `Identification Character: ${species.identification_character || 'N/A'}`,
            `Phenology: ${species.phenology || 'N/A'}`,
            `Seed Germination: ${species.seed_germination || 'N/A'}`,
            `Pests: ${species.pest || 'N/A'}`
        ].join('\n\n')
    }

    return (
        <>
            <div><TheDrawer></TheDrawer></div>
            <h1>Species Database Dashboard</h1>
            <h2 style={{ marginTop: '20px',  fontSize: '20px' }}>English Database:</h2>
            <div style={{ marginTop: '20px' }}><MainTableSelect onRowSelect={handleRowSelect}></MainTableSelect></div>

            {selectedSpecies && (
                <Box sx={{ marginTop: 3, maxWidth: '70%', marginX: 'auto' }}>
                    <TextField
                        fullWidth
                        label="Species Details"
                        multiline
                        rows={12}
                        value={formatSpeciesData(selectedSpecies)}
                        sx={{
                            '& .MuiInputBase-input': { color: 'white' },
                            '& .MuiInputLabel-root': { color: 'white' },
                        }}
                    />
                </Box>
            )}

            <h2 style={{ marginTop: '20px',  fontSize: '20px'}}>Tetum Database:</h2>
            <div style={{ marginTop: '20px' }}><MainTableSelectTetum onRowSelect={handleRowSelectTetum}></MainTableSelectTetum></div>

            {selectedSpeciesTetum && (
                <Box sx={{ marginTop: 3, maxWidth: '70%', marginX: 'auto' }}>
                    <TextField
                        fullWidth
                        label="Species Details"
                        multiline
                        rows={12}
                        value={formatSpeciesData(selectedSpeciesTetum)}
                        sx={{
                            '& .MuiInputBase-input': { color: 'white' },
                            '& .MuiInputLabel-root': { color: 'white' },
                        }}
                    />
                </Box>
            )}




            
        </>
    )
}