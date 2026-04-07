import MainTableSelect from '../mainTableSelect'
import MainTableSelectTetum from '../mainTableSelectTetum'
import { useState } from 'react'
import type { Species } from '../mainTableSelect'
import Box from '@mui/material/Box'
import { TextField } from '@mui/material'
import { translations } from '../translations'

export function Home() {
    const [lang, setLang] = useState<"en" | "tet">("en")
    const t = translations[lang]

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
            `${t.id}: ${species.species_id}`,
            `${t.scientificName}: ${species.scientific_name}`,
            `${t.commonName}: ${species.common_name}`,
            `${t.leafType}: ${species.leaf_type}`,
            `${t.fruitType}: ${species.fruit_type}`,
            `${t.etymology}: ${species.etymology || t.notAvailable}`,
            `${t.habitat}: ${species.habitat || t.notAvailable}`,
            `${t.identificationCharacter}: ${species.identification_character || t.notAvailable}`,
            `${t.phenology}: ${species.phenology || t.notAvailable}`,
            `${t.seedGermination}: ${species.seed_germination || t.notAvailable}`,
            `${t.pest}: ${species.pest || t.notAvailable}`
        ].join('\n\n')
    }

    return (
        <div>
            <div className="flex justify-between mb-4 items-center">
                <h2 className="text-3xl font-bold">{t.speciesDashboard}</h2>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button onClick={() => setLang("en")} style={{ marginRight: "10px" }}>
                        EN
                    </button>
                    <button onClick={() => setLang("tet")}>
                        TET
                    </button>
                </div>
            </div>

            <h2 style={{ marginTop: '20px', fontSize: '20px' }}>
                {t.englishDatabase}
            </h2>

            <div style={{ marginTop: '20px' }}>
                <MainTableSelect onRowSelect={handleRowSelect} lang={lang} />
            </div>

            {selectedSpecies && (
                <Box sx={{ marginTop: 3, maxWidth: '70%', marginX: 'auto' }}>
                    <TextField
                        fullWidth
                        label={t.speciesDetails}
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

            <h2 style={{ marginTop: '20px', fontSize: '20px' }}>
                {t.tetumDatabase}
            </h2>

            <div style={{ marginTop: '20px' }}>
                <MainTableSelectTetum onRowSelect={handleRowSelectTetum} lang={lang} />
            </div>

            {selectedSpeciesTetum && (
                <Box sx={{ marginTop: 3, maxWidth: '70%', marginX: 'auto' }}>
                    <TextField
                        fullWidth
                        label={t.speciesDetails}
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
        </div>
    )
}