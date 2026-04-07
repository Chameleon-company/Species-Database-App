import { TextField } from '@mui/material'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import React, { useState } from 'react'
import Alert from '@mui/material/Alert'
import axios from 'axios'
import { adminFetch } from '../utils/adminFetch'
import { translations } from '../translations'

const API_URL = import.meta.env.VITE_API_URL
const API_BASE = import.meta.env.VITE_API_BASE

export default function Page1() {
    const [lang, setLang] = useState<"en" | "tet">("en");

const t = translations[lang];

    const bigFieldSx = {
        '& .MuiInputBase-input': {
            fontSize: '1.1rem',
        },
        '& .MuiInputLabel-root': {
            fontSize: '1rem',
        },
        '& .MuiFormHelperText-root': {
            fontSize: '0.9rem',
        },
    }

    const maxEnglishChar = 2000
    const maxTetumChar = maxEnglishChar + (maxEnglishChar * 0.10)

    const [error, setError] = useState('')
    const [touched, setTouched] = useState<Record<string, boolean>>({})

    const markTouched = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }))
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

    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')
    const [tetumTranslate, setTetumTranslate] = useState(false)

    const translateToTetum = async () => {
        setError('')

        if (!formData.scientificName) {
            setError(t.scientificNameEmpty)
            return
        } if (!formData.commonName) {
            setError(t.commonNameEmpty)
            return
        } if (!formData.leafType) {
            setError(t.leafTypeEmpty)
            return
        } if (!formData.fruitType) {
            setError(t.fruitTypeEmpty)
            return
        }

        console.log("URL: ", API_URL)

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

        console.log('Translation: ', textArray)

        try {
            setLoading(true)

            const response = await axios.post(`${API_BASE}/translate`, { text: textArray })
            console.log('Translation: ', response)

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
        } catch {
            console.error('Translation error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            [field]: event.target.value
        }))
    }

    const handleChangeTetum = (field: keyof typeof formDataTetum) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormDataTetum((prevFormData) => ({
            ...prevFormData,
            [field]: event.target.value
        }))
    }

    const resetTetumForm = () => {
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

    const handleTetumTranslate = async () => {
        setError('')
        resetTetumForm()
        setTetumTranslate(true)
        await translateToTetum()
    }

    const handleClear = () => {
        setError('')
        setStatus('')
        setTetumTranslate(false)

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

        resetTetumForm()
    }

    const handleSubmit = async () => {
        const requiredFields = [
            { value: formData.scientificName, name: t.scientificName },
            { value: formData.commonName, name: t.commonName },
            { value: formData.leafType, name: t.leafType },
            { value: formData.fruitType, name: t.fruitType },
            { value: formDataTetum.scientificNameTetum, name: t.scientificName },
            { value: formDataTetum.commonNameTetum, name: t.commonName },
            { value: formDataTetum.leafTypeTetum, name: t.leafType },
            { value: formDataTetum.fruitTypeTetum, name: t.fruitType }
        ]

        const emptyField = requiredFields.find(field => !field.value)

        if (emptyField) {
            setError(`${emptyField.name} ${t.cannotBeEmpty}`)
            return
        }

        setLoading(true)
        setStatus('')
        setError('')

        try {
            const response = await adminFetch(`${API_BASE}/species`, {
                method: 'POST',
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
                    pest_tetum: formDataTetum.pestsTetum,
                }),
            })

            const text = await response.text()
            let data

            try {
                data = JSON.parse(text)
            } catch {
                data = { raw: text }
            }

            if (!response.ok) {
                console.error('UPLOAD FAILED:', response.status, data)
                setError(
                    data?.error || data?.message || data?.raw || `${t.uploadFailed} (${response.status})`
                )
                return
            }

            console.log("success:", data)
            setStatus(t.uploadSuccessful)
        } catch (error) {
            console.error('Error:', error)
            setError(t.databaseUploadFailed)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box width="100%">
            <div className="flex justify-between mb-4 items-center">
                <h2 className="text-3xl font-bold">{t.addSpecies}</h2>
    
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button onClick={() => setLang("en")} style={{ marginRight: "10px" }}>
                        EN
                    </button>
                    <button onClick={() => setLang("tet")}>
                        TET
                    </button>
                </div>
            </div>
    
            <Box width="100%" maxWidth={900} mx="auto" mt={3} px={2}>
                <Box display="flex" gap={2} mb={2} justifyContent="center">
                    <TextField
                        sx={{ ...bigFieldSx, maxWidth: 280 }}
                        label={t.scientificName}
                        value={formData.scientificName}
                        onChange={handleChange('scientificName')}
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
                        label={t.commonName}
                        value={formData.commonName}
                        onChange={handleChange('commonName')}
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
                        label={t.leafType}
                        value={formData.leafType}
                        onChange={handleChange('leafType')}
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
                        label={t.fruitType}
                        value={formData.fruitType}
                        onChange={handleChange('fruitType')}
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
            </Box>

            <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                <h5>{t.optional}</h5>
            </Box>

            <Box sx={{ maxWidth: 1000, marginX: 'auto' }}>
                <Box display="flex" gap={2} mb={2}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={formData.etymology}
                        onChange={handleChange('etymology')}
                        slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                        sx={bigFieldSx}
                        label={t.etymology}
                    />

                    <TextField
                        fullWidth
                        label={t.habitat}
                        multiline
                        rows={4}
                        value={formData.habitat}
                        onChange={handleChange('habitat')}
                        slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                        sx={bigFieldSx}
                    />
                </Box>

                <Box display="flex" gap={2} mb={2}>
                    <TextField
                        fullWidth
                        label={t.identificationCharacter}
                        id="BigText3"
                        multiline
                        rows={4}
                        value={formData.identificationCharacteristics}
                        onChange={handleChange('identificationCharacteristics')}
                        slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                        sx={bigFieldSx}
                    />

                    <TextField
                        fullWidth
                        label={t.phenology}
                        id="BigText4"
                        multiline
                        rows={4}
                        value={formData.phenology}
                        onChange={handleChange('phenology')}
                        slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                        sx={bigFieldSx}
                    />
                </Box>

                <Box display="flex" gap={2} mb={2}>
                    <TextField
                        fullWidth
                        label={t.seedGermination}
                        id="BigText5"
                        multiline
                        rows={4}
                        value={formData.seedGermination}
                        onChange={handleChange('seedGermination')}
                        slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                        sx={bigFieldSx}
                    />

                    <TextField
                        fullWidth
                        label={t.pest}
                        id="BigText6"
                        multiline
                        rows={4}
                        value={formData.pests}
                        onChange={handleChange('pests')}
                        slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                        sx={bigFieldSx}
                    />
                </Box>
            </Box>

            <Box display="flex" justifyContent="center" alignItems="center" mb={3}>
                {status && (
                    <Alert severity="success">
                        {status}
                    </Alert>
                )}

                {error && (
                    <Alert severity="error">
                        {error}
                    </Alert>
                )}
            </Box>

            <Box>
                <Button variant="contained" onClick={handleTetumTranslate}>
                    {t.translateToTetum}
                </Button>
            </Box>

            <Box sx={{ marginTop: 2 }}>
                <Button variant="contained" onClick={handleClear}>
                    {t.clearEntry}
                </Button>
            </Box>

            {tetumTranslate && (
                <Box sx={{ marginTop: 2 }}>
                    <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                        <div><h3>{t.tetumTranslation}</h3></div>
                        <div><h5>{t.reviewTetumText}</h5></div>
                    </Box>

                    <Box display="flex" gap={2} mb={2} justifyContent="center">
                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label={t.scientificName}
                            value={formData.scientificName}
                            disabled
                        />

                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label={t.commonName}
                            value={formDataTetum.commonNameTetum}
                            onChange={handleChangeTetum('commonNameTetum')}
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
                            value={formDataTetum.leafTypeTetum}
                            onChange={handleChangeTetum('leafTypeTetum')}
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
                            value={formDataTetum.fruitTypeTetum}
                            onChange={handleChangeTetum('fruitTypeTetum')}
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

                    <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                        <h5>{t.optional}</h5>
                    </Box>

                    <Box sx={{ maxWidth: 1000, marginX: 'auto' }}>
                        <Box display="flex" gap={2} mb={2}>
                            <TextField
                                fullWidth
                                label={t.etymology}
                                multiline
                                rows={4}
                                value={formDataTetum.etymologyTetum}
                                onChange={handleChangeTetum('etymologyTetum')}
                                slotProps={{ htmlInput: { maxLength: maxTetumChar } }}
                                sx={bigFieldSx}
                            />

                            <TextField
                                fullWidth
                                label={t.habitat}
                                multiline
                                rows={4}
                                value={formDataTetum.habitatTetum}
                                onChange={handleChangeTetum('habitatTetum')}
                                slotProps={{ htmlInput: { maxLength: maxTetumChar } }}
                                sx={bigFieldSx}
                            />
                        </Box>

                        <Box display="flex" gap={2} mb={2}>
                            <TextField
                                fullWidth
                                label={t.identificationCharacter}
                                multiline
                                rows={4}
                                value={formDataTetum.identificationCharacteristicsTetum}
                                onChange={handleChangeTetum('identificationCharacteristicsTetum')}
                                slotProps={{ htmlInput: { maxLength: maxTetumChar } }}
                                sx={bigFieldSx}
                            />

                            <TextField
                                fullWidth
                                label={t.phenology}
                                multiline
                                rows={4}
                                value={formDataTetum.phenologyTetum}
                                onChange={handleChangeTetum('phenologyTetum')}
                                slotProps={{ htmlInput: { maxLength: maxTetumChar } }}
                                sx={bigFieldSx}
                            />
                        </Box>

                        <Box display="flex" gap={2} mb={2}>
                            <TextField
                                fullWidth
                                label={t.seedGermination}
                                multiline
                                rows={4}
                                value={formDataTetum.seedGerminationTetum}
                                onChange={handleChangeTetum('seedGerminationTetum')}
                                slotProps={{ htmlInput: { maxLength: maxTetumChar } }}
                                sx={bigFieldSx}
                            />

                            <TextField
                                fullWidth
                                label={t.pest}
                                multiline
                                rows={4}
                                value={formDataTetum.pestsTetum}
                                onChange={handleChangeTetum('pestsTetum')}
                                slotProps={{ htmlInput: { maxLength: maxTetumChar } }}
                                sx={bigFieldSx}
                            />
                        </Box>
                    </Box>

                    <Box sx={{ marginTop: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? t.adding : t.addEntry}
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    )
}