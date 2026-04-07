import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import React, { useEffect, useState } from 'react'
import { TextField } from '@mui/material'
import Alert from '@mui/material/Alert'
import type { Species } from '../mainTableSelect'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import axios from 'axios'
import { useParams } from "react-router-dom";
import { adminFetch } from '../utils/adminFetch'
import { translations } from '../translations'

const API_URL = import.meta.env.VITE_API_URL
const API_BASE = import.meta.env.VITE_API_BASE

const textFieldBaseSx = {
    '& .MuiInputBase-input': { color: 'white' },
    '& .MuiInputLabel-root': { color: 'white' },
}

const formContainerSx = {
    width: '100%',
    paddingX: 0
}

const containerBoxSx = {
    marginTop: 2,
    width: '30%',
    paddingX: 0,
    marginX: 'auto'
}

const errorContainerSx = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
}

const bigFieldSx = {
    '& .MuiInputBase-input': {
        fontSize: '1.1rem',
    },
    '& .MuiInputLabel-root': {
        fontSize: '1rem',
    },
    '& .MuiFormHelperText-root': {
        fontSize: '0.9rem',
        color: 'red',
    },
}

export function EditEntry() {
    const { id } = useParams<{ id: string }>()

    const [lang, setLang] = useState<"en" | "tet">(
        (localStorage.getItem("lang") as "en" | "tet") || "en"
    )
    const t = translations[lang]

    const [error, setError] = useState('')
    const [uploadError, setUploadError] = useState('')
    const [loading, setLoading] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [status, setStatus] = useState('')
    const [rowSelected, setRowSelected] = useState(false)
    const [ID, setID] = useState(-1)

    const [, setResetKey] = useState(0)
    const [translated, setTranslated] = useState(false)
    const [translateLoading, setTranslateLoading] = useState(false)

    const [speciesTet, setSpeciesTet] = useState<Species[]>([])
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    const markTouched = (name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }))
    }

    const [formData, setFormData] = useState({
        scientificName: '',
        commonName: '',
        leafType: '',
        fruitType: '',
        etymology: '',
        habitat: '',
        identificationCharacteristics: '',
        phenology: '',
        seedGermination: '',
        pests: ''
    })

    const [formDataTetum, setFormDataTetum] = useState({
        scientificNameTetum: '',
        commonNameTetum: '',
        leafTypeTetum: '',
        fruitTypeTetum: '',
        etymologyTetum: '',
        habitatTetum: '',
        identificationCharacteristicsTetum: '',
        phenologyTetum: '',
        seedGerminationTetum: '',
        pestsTetum: ''
    })

    const [, setTetumRowError] = useState(false)
    const [open, setOpen] = useState(false)

    const changeLang = (newLang: "en" | "tet") => {
        localStorage.setItem("lang", newLang)
        setLang(newLang)
    }

    const handleClickOpen = () => {
        setOpen(true)
    }

    const handleClose = () => {
        setOpen(false)
    }

    const handleConfirmDelete = async () => {
        setOpen(false)
        await handleSubmitDelete()
    }

    const handleSubmitDelete = async () => {
        setDeleteLoading(true)
        setStatus('')
        setError('')

        try {
            const res = await adminFetch(`${import.meta.env.VITE_API_URL}/species/${ID}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || t.failedToDeleteSpecies)
            }

            setResetKey(prev => prev + 1)
            setStatus(t.speciesDeletedSuccessfully)
            setError('')
            setRowSelected(false)
            setID(-1)

            setFormData({
                scientificName: '',
                commonName: '',
                leafType: '',
                fruitType: '',
                etymology: '',
                habitat: '',
                identificationCharacteristics: '',
                phenology: '',
                seedGermination: '',
                pests: ''
            })
        }
        catch (error) {
            setError(`Error: ${(error as Error).message}`)
        }
        finally {
            setDeleteLoading(false)
        }
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target

        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleChangeTetum = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target

        setFormDataTetum(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const resetTet = () => {
        setFormDataTetum({
            scientificNameTetum: '',
            commonNameTetum: '',
            leafTypeTetum: '',
            fruitTypeTetum: '',
            etymologyTetum: '',
            habitatTetum: '',
            identificationCharacteristicsTetum: '',
            phenologyTetum: '',
            seedGerminationTetum: '',
            pestsTetum: ''
        })
    }

    const handleTranslate = async () => {
        resetTet()
        setTranslated(false)
        setError('')
        setTranslateLoading(true)

        let hasError = false

        if (!formData.scientificName) {
            setError(t.scientificNameEmpty)
            hasError = true
        } else if (!formData.commonName) {
            setError(t.commonNameEmpty)
            hasError = true
        } else if (!formData.leafType) {
            setError(t.leafTypeEmpty)
            hasError = true
        } else if (!formData.fruitType) {
            setError(t.fruitTypeEmpty)
            hasError = true
        }

        if (hasError) {
            setTranslateLoading(false)
            return
        }

        const tempEtymology = formData.etymology === "" ? "-" : formData.etymology
        const tempHabitat = formData.habitat === "" ? "-" : formData.habitat
        const tempIdent = formData.identificationCharacteristics === "" ? "-" : formData.identificationCharacteristics
        const tempPhenology = formData.phenology === "" ? "-" : formData.phenology
        const tempSeed = formData.seedGermination === "" ? "-" : formData.seedGermination
        const tempPest = formData.pests === "" ? "-" : formData.pests

        const textArray = [
            formData.scientificName,
            formData.commonName,
            formData.leafType,
            formData.fruitType,
            tempEtymology,
            tempHabitat,
            tempIdent,
            tempPhenology,
            tempSeed,
            tempPest
        ]

        try {
            const response = await axios.post(`${API_BASE}/translate`, { text: textArray })
            const translatedText = response.data

            if (translatedText[4] === "-") translatedText[4] = ""
            if (translatedText[5] === "-") translatedText[5] = ""
            if (translatedText[6] === "-") translatedText[6] = ""
            if (translatedText[7] === "-") translatedText[7] = ""
            if (translatedText[8] === "-") translatedText[8] = ""
            if (translatedText[9] === "-") translatedText[9] = ""

            setFormDataTetum({
                scientificNameTetum: formData.scientificName,
                commonNameTetum: translatedText[1],
                leafTypeTetum: translatedText[2],
                fruitTypeTetum: translatedText[3],
                etymologyTetum: translatedText[4],
                habitatTetum: translatedText[5],
                identificationCharacteristicsTetum: translatedText[6],
                phenologyTetum: translatedText[7],
                seedGerminationTetum: translatedText[8],
                pestsTetum: translatedText[9]
            })
            setTranslated(true)
        }
        catch (err) {
            console.error('Translation error:', err)
            setError(t.uploadFailed)
        }
        finally {
            setTranslateLoading(false)
        }
    }

    const handleSubmit = async () => {
        const requiredFields = [
            { value: formData.scientificName, name: t.scientificName },
            { value: formData.commonName, name: t.commonName },
            { value: formData.leafType, name: t.leafType },
            { value: formData.fruitType, name: t.fruitType },
            { value: formDataTetum.commonNameTetum, name: t.commonName },
            { value: formDataTetum.leafTypeTetum, name: t.leafType },
            { value: formDataTetum.fruitTypeTetum, name: t.fruitType }
        ]

        const emptyField = requiredFields.find(field => !field.value)

        if (emptyField) {
            setUploadError(`${emptyField.name} ${t.cannotBeEmpty}`)
            return
        }

        setLoading(true)
        setStatus('')
        setError('')
        setUploadError('')

        try {
            const res = await adminFetch(`${import.meta.env.VITE_API_URL}/species/${ID}`, {
                method: 'PUT',
                body: JSON.stringify({
                    scientific_name: formData.scientificName,
                    common_name: formData.commonName,
                    etymology: formData.etymology,
                    habitat: formData.habitat,
                    identification_character: formData.identificationCharacteristics,
                    leaf_type: formData.leafType,
                    fruit_type: formData.fruitType,
                    phenology: formData.phenology,
                    seed_germination: formData.seedGermination,
                    pest: formData.pests,

                    scientific_name_tetum: formDataTetum.scientificNameTetum,
                    common_name_tetum: formDataTetum.commonNameTetum,
                    etymology_tetum: formDataTetum.etymologyTetum,
                    habitat_tetum: formDataTetum.habitatTetum,
                    identification_character_tetum: formDataTetum.identificationCharacteristicsTetum,
                    leaf_type_tetum: formDataTetum.leafTypeTetum,
                    fruit_type_tetum: formDataTetum.fruitTypeTetum,
                    phenology_tetum: formDataTetum.phenologyTetum,
                    seed_germination_tetum: formDataTetum.seedGerminationTetum,
                    pest_tetum: formDataTetum.pestsTetum
                })
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                setUploadError(err.error || t.databaseUploadFailed)
                throw new Error(err.error || 'Update failed')
            }

            await res.json()
            setResetKey(prev => prev + 1)
            setStatus('Species updated successfully!')
            setRowSelected(false)
        }
        catch (error) {
            setUploadError(`Error: ${(error as Error).message}`)
        }
        finally {
            setLoading(false)
        }
    }

    const handleRowSelect = async (rowData: Species | null) => {
        setStatus('')
        setError('')
        setTranslated(false)

        if (!rowData) {
            setRowSelected(false)
            setID(-1)

            setFormData({
                scientificName: '',
                commonName: '',
                leafType: '',
                fruitType: '',
                etymology: '',
                habitat: '',
                identificationCharacteristics: '',
                phenology: '',
                seedGermination: '',
                pests: ''
            })
            resetTet()
            return
        }

        const rowID = rowData.species_id
        setID(rowID)

        setFormData({
            scientificName: rowData.scientific_name || '',
            commonName: rowData.common_name || '',
            leafType: rowData.leaf_type || '',
            fruitType: rowData.fruit_type || '',
            etymology: rowData.etymology || '',
            habitat: rowData.habitat || '',
            identificationCharacteristics: rowData.identification_character || '',
            phenology: rowData.phenology || '',
            seedGermination: rowData.seed_germination || '',
            pests: rowData.pest || ''
        })
        setRowSelected(true)

        try {
            const tetumRow = speciesTet.find(r => r.species_id === rowID)

            if (!tetumRow) {
                setTetumRowError(true)
                resetTet()
                setError('')
                return
            }

            setFormDataTetum({
                scientificNameTetum: tetumRow.scientific_name || '',
                commonNameTetum: tetumRow.common_name || '',
                leafTypeTetum: tetumRow.leaf_type || '',
                fruitTypeTetum: tetumRow.fruit_type || '',
                etymologyTetum: tetumRow.etymology || '',
                habitatTetum: tetumRow.habitat || '',
                identificationCharacteristicsTetum: tetumRow.identification_character || '',
                phenologyTetum: tetumRow.phenology || '',
                seedGerminationTetum: tetumRow.seed_germination || '',
                pestsTetum: tetumRow.pest || ''
            })

            setTetumRowError(false)
            setError('')
        }
        catch {
            resetTet()
            setTetumRowError(true)
            setError("Error loading Tetum row.")
        }
    }

    useEffect(() => {
        async function loadSpecies() {
            if (!id) return

            try {
                const bundRes = await adminFetch(`${API_URL}/bundle`)
                if (!bundRes.ok) throw new Error("failed to load bundle")

                const bundle = await bundRes.json()
                const tetList = bundle.species_tet ?? []

                const res = await adminFetch(`${API_URL}/species/${id}`)
                if (!res.ok) throw new Error(`failed to load species`)

                const species = await res.json()

                setSpeciesTet(tetList)
                handleRowSelect(species)
            }
            catch (err) {
                console.error("failed loading species for editing", err)
                setError("Failed to load species")
            }
        }

        loadSpecies()
    }, [id])

    return (
        <>
            <div className="flex justify-between mb-4 items-center">
                <h2 className="text-3xl font-bold">{t.editExistingEntry}</h2>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button onClick={() => changeLang("en")}>EN</button>
                    <button onClick={() => changeLang("tet")}>TET</button>
                </div>
            </div>

            <Box sx={containerBoxSx}>
                {status && (
                    <Alert severity="success">
                        {status}
                    </Alert>
                )}
            </Box>

            <Box sx={errorContainerSx}>
                {error && (
                    <Alert severity="error">
                        {error}
                    </Alert>
                )}
            </Box>

            {rowSelected && (
                <Box sx={formContainerSx}>
                    <h2 style={{ fontSize: '1.75rem' }}>English Entry</h2>

                    <Box display="flex" gap={2} mb={2} justifyContent="center">
                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            name="scientificName"
                            label={t.scientificName}
                            value={formData.scientificName}
                            onChange={handleChange}
                            onBlur={() => markTouched('scientificName')}
                            required
                            error={touched.scientificName && !formData.scientificName}
                            helperText={
                                touched.scientificName && !formData.scientificName
                                    ? t.scientificNameEmpty
                                    : ""
                            }
                        />

                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            name="commonName"
                            label={t.commonName}
                            value={formData.commonName}
                            onChange={handleChange}
                            onBlur={() => markTouched('commonName')}
                            required
                            error={touched.commonName && !formData.commonName}
                            helperText={
                                touched.commonName && !formData.commonName
                                    ? t.commonNameEmpty
                                    : ""
                            }
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2} justifyContent="center">
                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            name="leafType"
                            label={t.leafType}
                            value={formData.leafType}
                            onChange={handleChange}
                            onBlur={() => markTouched('leafType')}
                            required
                            error={touched.leafType && !formData.leafType}
                            helperText={
                                touched.leafType && !formData.leafType
                                    ? t.leafTypeEmpty
                                    : ""
                            }
                        />

                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            name="fruitType"
                            label={t.fruitType}
                            value={formData.fruitType}
                            onChange={handleChange}
                            onBlur={() => markTouched('fruitType')}
                            required
                            error={touched.fruitType && !formData.fruitType}
                            helperText={
                                touched.fruitType && !formData.fruitType
                                    ? t.fruitTypeEmpty
                                    : ""
                            }
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            fullWidth
                            label={t.etymology}
                            name="etymology"
                            multiline
                            rows={4}
                            value={formData.etymology}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />

                        <TextField
                            fullWidth
                            label={t.habitat}
                            name="habitat"
                            multiline
                            rows={4}
                            value={formData.habitat}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            fullWidth
                            label={t.identificationCharacteristics}
                            name="identificationCharacteristics"
                            multiline
                            rows={4}
                            value={formData.identificationCharacteristics}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />

                        <TextField
                            fullWidth
                            label={t.phenology}
                            name="phenology"
                            multiline
                            rows={4}
                            value={formData.phenology}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            fullWidth
                            label={t.seedGermination}
                            name="seedGermination"
                            multiline
                            rows={5}
                            value={formData.seedGermination}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />

                        <TextField
                            fullWidth
                            label={t.pest}
                            name="pests"
                            multiline
                            rows={5}
                            value={formData.pests}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />
                    </Box>

                    <Box>
                        <Button
                            variant="contained"
                            onClick={handleTranslate}
                            disabled={translateLoading}
                        >
                            {translateLoading ? 'Translating...' : 'Translate for Tetum Entry'}
                        </Button>
                    </Box>
                </Box>
            )}

            {rowSelected && (
                <Box mt={4}>
                    {translated ? (
                        <h2 style={{ fontSize: '1.5rem' }}>Translated Tetum Entry</h2>
                    ) : (
                        <h2 style={{ fontSize: '1.5rem' }}>Original Tetum Entry</h2>
                    )}

                    <h3>Please check fields to ensure correct translation:</h3>

                    <Box display="flex" gap={2} mb={2} justifyContent="center">
                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label={t.scientificName}
                            name="scientificNameTetum"
                            value={formData.scientificName}
                            disabled
                        />

                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label={t.commonName}
                            name="commonNameTetum"
                            value={formDataTetum.commonNameTetum}
                            onChange={handleChangeTetum}
                            onBlur={() => markTouched('commonNameTetum')}
                            required
                            error={touched.commonNameTetum && !formDataTetum.commonNameTetum}
                            helperText={
                                touched.commonNameTetum && !formDataTetum.commonNameTetum
                                    ? t.commonNameEmpty
                                    : ""
                            }
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2} justifyContent="center">
                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label={t.leafType}
                            name="leafTypeTetum"
                            value={formDataTetum.leafTypeTetum}
                            onChange={handleChangeTetum}
                            onBlur={() => markTouched('leafTypeTetum')}
                            required
                            error={touched.leafTypeTetum && !formDataTetum.leafTypeTetum}
                            helperText={
                                touched.leafTypeTetum && !formDataTetum.leafTypeTetum
                                    ? t.leafTypeEmpty
                                    : ""
                            }
                        />

                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label={t.fruitType}
                            name="fruitTypeTetum"
                            value={formDataTetum.fruitTypeTetum}
                            onChange={handleChangeTetum}
                            onBlur={() => markTouched('fruitTypeTetum')}
                            required
                            error={touched.fruitTypeTetum && !formDataTetum.fruitTypeTetum}
                            helperText={
                                touched.fruitTypeTetum && !formDataTetum.fruitTypeTetum
                                    ? t.fruitTypeEmpty
                                    : ""
                            }
                        />
                    </Box>

                    <div><h5>{t.optional}</h5></div>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            fullWidth
                            label={t.etymology}
                            name="etymologyTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.etymologyTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />

                        <TextField
                            fullWidth
                            label={t.habitat}
                            name="habitatTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.habitatTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            fullWidth
                            label={t.identificationCharacteristics}
                            name="identificationCharacteristicsTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.identificationCharacteristicsTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />

                        <TextField
                            fullWidth
                            label={t.phenology}
                            name="phenologyTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.phenologyTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                            fullWidth
                            label={t.seedGermination}
                            name="seedGerminationTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.seedGerminationTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />

                        <TextField
                            fullWidth
                            label={t.pest}
                            name="pestsTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.pestsTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />
                    </Box>

                    <Box sx={errorContainerSx}>
                        {uploadError && (
                            <Alert severity="error">
                                {uploadError}
                            </Alert>
                        )}
                    </Box>

                    <Box>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={loading || translateLoading}
                        >
                            {loading ? 'Editing...' : 'Push edit'}
                        </Button>
                    </Box>

                    <Box sx={{ marginTop: 2 }}>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleClickOpen}
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete Entry'}
                        </Button>
                    </Box>
                </Box>
            )}

            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {t.deleteSpeciesEntry}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {t.deleteConfirmPrefix} "{formData.commonName}"? {t.deleteConfirmSuffix}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>{t.cancel}</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        {t.delete}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}