import TheDrawer from '../Components/drawer'
import { TextField } from '@mui/material'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import React, { useState } from 'react'
import Alert from '@mui/material/Alert'
import axios from 'axios'
import { adminFetch } from '../utils/adminFetch'


const API_URL = import.meta.env.VITE_API_URL
const API_BASE = import.meta.env.VITE_API_BASE

export default function Page1() {
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
  
    //Max char length for english text boxes
    const maxEnglishChar = 2000
    //Max char length for Tetum text. (10% has been added just incase the translation comes back with more characters.)
    const maxTetumChar = maxEnglishChar + (maxEnglishChar * 0.10)
    //Max char length for names / fruit and leaf types


    const [error, setError] = useState('')

    const [touched, setTouched] = useState<Record<string, boolean>>({});
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
        //Checks
        if (!formData.scientificName) {setError('Scientific Name Cannot be empty')}
        else if (!formData.commonName) {setError('Common Name Cannot be empty')}
        else if (!formData.leafType) {setError('Leaf Type Cannot be empty')}
        else if (!formData.fruitType) {setError('Fruit Type Cannot be empty')}
        if(error)
        {
            setLoading(false)
            return
        }
        console.log("URL: ", API_URL)
        const tempEtymology = formData.etymology == "" ? "-" : formData.etymology
        const tempHabitat = formData.habitat == "" ? "-" : formData.habitat
        const tempIdent = formData.identificationCharacteristics == "" ? "-" : formData.identificationCharacteristics
        const tempPhenology = formData.phenology == "" ? "-" : formData.phenology
        const tempSeed = formData.seedGermination == "" ? "-" : formData.seedGermination
        const tempPest = formData.pests == "" ? "-" : formData.pests           


        const textArray = [formData.scientificName, formData.commonName, formData.leafType, formData.fruitType, tempEtymology, tempHabitat, tempIdent, tempPhenology, tempSeed, tempPest]
        console.log('Translation: ', textArray)
        try {
            const response = await axios.post(`${API_BASE}/translate`, { text: textArray })
            console.log('Translation: ', response)

            const translations = response.data

            if (translations[4] === "-") translations[4] = ""
            if (translations[5] === "-") translations[5] = ""
            if (translations[6] === "-") translations[6] = ""
            if (translations[7] === "-") translations[7] = ""
            if (translations[8] === "-") translations[8] = ""
            if (translations[9] === "-") translations[9] = ""


            setFormDataTetum({
                scientificNameTetum: formData.scientificName,
                commonNameTetum: translations[1],
                leafTypeTetum: translations[2],
                fruitTypeTetum: translations[3],
                etymologyTetum: translations[4],
                habitatTetum: translations[5],
                identificationCharacteristicsTetum: translations[6],
                phenologyTetum: translations[7],
                seedGerminationTetum: translations[8],
                pestsTetum: translations[9]
            })
            


        }
        catch {
            console.error('Translation error:', error)
        }
        finally {
            setLoading(false)
        }

    }


    
    //Handles text being written into text boxes
    const handleChange = (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            [field]: event.target.value
        }))
    }

    //Handles change in tetum language text boxes
    const handleChangeTetum = (field: keyof typeof formDataTetum) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormDataTetum((prevFormData) => ({
            ...prevFormData,
            [field]: event.target.value
        }))
    }

    //reset tetum before every translate
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

    //Hendles the translate button being pressed. 
    const handleTetumTranslate = async () => {
        setError('')
        resetTetumForm()
        setTetumTranslate(true)
        await translateToTetum()
    }

    //Handles the clear button being pressed. 
    const handleClear = () => {
        setError('')
        setStatus('')
        setTetumTranslate(false)

        setFormData( {
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

    //What happens when the add button is pressed
    const handleSubmit = async () => {
        
        const requiredFields = [
            { value: formData.scientificName, name: 'Scientific Name' },
            { value: formData.commonName, name: 'Common Name' },
            { value: formData.leafType, name: 'Leaf Type' },
            { value: formData.fruitType, name: 'Fruit Type' },

            { value: formDataTetum.scientificNameTetum, name: 'Scientific Name' },
            { value: formDataTetum.commonNameTetum, name: 'Common Name' },
            { value: formDataTetum.leafTypeTetum, name: 'Leaf Type' },
            { value: formDataTetum.fruitTypeTetum, name: 'Fruit Type' }
        ]

        const emptyField = requiredFields.find(field => !field.value)

        if (emptyField) {
            setError(`${emptyField.name} cannot be empty!`)
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
            }
            catch {
                data = {raw: text}
            }
            if (!response.ok){
                console.error('UPLOAD FAILED:', response.status, data)
                setError(
                    data?.error || data?.message || data?.raw || `Upload failed (${response.status})`
                )
                return
            }
            console.log("success:", data)
            setStatus("Upload successful")

        } catch (error) {
            console.error('Error:', error)
            setError("Error, database upload failed")
        }

        finally {
            setLoading(false)
        }

        



    //UI
    }
    return (
        <Box width="100%">

            <div><TheDrawer></TheDrawer></div>
            <h1>Add Species</h1>

            <Box width="100%" maxWidth={900} mx="auto" mt={3} px={2}>   
                <Box display="flex" gap={2} mb={2} justifyContent="center">
                    <TextField
                        sx={{ ...bigFieldSx, maxWidth: 280 }}
                        label="Scientific Name"
                        value={formData.scientificName}
                        onChange={handleChange('scientificName')}
                        onBlur={() => markTouched('scientificName')}
                        required
                        error={touched.scientificName && !formData.scientificName}
                    />

                    <TextField
                        sx={{ ...bigFieldSx, maxWidth: 280 }}
                        label="Common Name"
                        value={formData.commonName}
                        onChange={handleChange('commonName')}
                        onBlur={() => markTouched('commonName')}
                        required
                        error={touched.commonName &&!formData.commonName}
                        />

                </Box>

                <Box display="flex" gap={2} mb={2} justifyContent="center">
                    <TextField
                        sx={{ ...bigFieldSx, maxWidth: 280 }}
                        label="Leaf Type"
                        value={formData.leafType}
                        onChange={handleChange('leafType')}
                        onBlur={() => markTouched('leafType')}
                        required
                        error={touched.leafType && !formData.leafType}
                    />

                    <TextField
                        sx={{ ...bigFieldSx, maxWidth: 280 }}
                        label="Fruit Type"
                        value={formData.fruitType}
                        onChange={handleChange('fruitType')}
                        onBlur={() => markTouched('fruitType')}
                        required
                        error={touched.fruitType &&!formData.fruitType}
                        />

                </Box>
            </Box>

            <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                <h5>Optional:</h5>
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
                    label="Etymology"   
                />

                <TextField 
                    fullWidth 
                    label="Habitat" 
                    multiline
                    rows={4}
                    value={formData.habitat}
                    onChange={handleChange('habitat')}
                    slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                    sx={bigFieldSx}
                />
            </Box>


            <Box display="flex" gap={2} mb={2}>
                <TextField fullWidth 
                    label="Identification Characteristics" 
                    id="BigText3"
                    multiline
                    rows={4}
                    value={formData.identificationCharacteristics}
                    onChange={handleChange('identificationCharacteristics')}
                    slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                    sx={bigFieldSx}
                />

                <TextField fullWidth 
                    label="Phenology" 
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
                <TextField fullWidth 
                    label="Seed Germination" 
                    id="BigText5"
                    multiline
                    rows={4}
                    value={formData.seedGermination}
                    onChange={handleChange('seedGermination')}
                    slotProps={{ htmlInput: { maxLength: maxEnglishChar } }}
                    sx={bigFieldSx}

                />

                <TextField fullWidth 
                    label="Pests" 
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
                <Button variant="contained"
                onClick={handleTetumTranslate}
                >
                    Translate to tetum
                </Button>
            </Box>

            <Box sx={{ marginTop: 2 }}>
                <Button variant="contained"
                onClick={handleClear}
                >
                    Clear Entry
                </Button>
            </Box>

            {tetumTranslate && (
                <Box sx={{marginTop: 2}}>
                    <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                    <div><h3>Tetum Translation:</h3></div>
                    <div><h5>Please review, edit if needed and then confirm using the button at the bottom</h5></div>
                    </Box>
                    <Box display="flex" gap={2} mb={2} justifyContent="center"> 
                            <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label="Scientific Name"
                            value={formData.scientificName}
                            disabled
                            />

                            <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label="Common Name"
                            value={formDataTetum.commonNameTetum}
                            onChange={handleChangeTetum('commonNameTetum')}
                            onBlur={() => markTouched('commonNameTetum')}
                            required
                            error={touched.commonNameTetum && !formDataTetum.commonNameTetum}
                            />                    
                    </Box>

                    <Box display="flex" gap={2} mb={2} justifyContent="center"> 
                        <TextField
                        sx={{ ...bigFieldSx, maxWidth: 280 }}
                        label="Leaf Type"
                        value={formDataTetum.leafTypeTetum}
                        onChange={handleChangeTetum('leafTypeTetum')}
                        onBlur={() => markTouched('leafTypeTetum')}
                        required
                        error={touched.leafTypeTetum && !formDataTetum.leafTypeTetum}
                        />

                        <TextField
                        sx={{ ...bigFieldSx, maxWidth: 280 }}
                        label="Fruit Type"
                        value={formDataTetum.fruitTypeTetum}
                        onChange={handleChangeTetum('fruitTypeTetum')}
                        onBlur={() => markTouched('fruitTypeTetum')}
                        required
                        error={touched.fruitTypeTetum && !formDataTetum.fruitTypeTetum}
                        />
                    
                    </Box>      

                    <Box sx={{ mt: 4, mb: 2, textAlign: 'center' }}>
                        <h5>Optional:</h5>
                    </Box>
                    <Box sx={{ maxWidth: 1000, marginX: 'auto' }}>
                    <Box display="flex" gap={2} mb={2}>
                        <TextField
                        fullWidth
                        label="Etymology"
                        multiline
                        rows={4}
                        value={formDataTetum.etymologyTetum}
                        onChange={handleChangeTetum('etymologyTetum')}
                        sx={bigFieldSx}
                        />

                        <TextField
                        fullWidth
                        label="Habitat"
                        multiline
                        rows={4}
                        value={formDataTetum.habitatTetum}
                        onChange={handleChangeTetum('habitatTetum')}
                        sx={bigFieldSx}
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField fullWidth 
                            label="Identification Characteristics" 
                            multiline
                            rows={4}
                            value={formDataTetum.identificationCharacteristicsTetum}
                            onChange={handleChangeTetum('identificationCharacteristicsTetum')}
                            sx={{bigFieldSx}}
                        />

                        <TextField fullWidth 
                            label="Phenology" 
                            multiline
                            rows={4}
                            value={formDataTetum.phenologyTetum}
                            onChange={handleChangeTetum('phenologyTetum')}
                            sx={{bigFieldSx}}
                        />
                    </Box>


                    <Box display="flex" gap={2} mb={2}>
                        <TextField fullWidth 
                            label="Seed Germination" 
                            multiline
                            rows={4}
                            value={formDataTetum.seedGerminationTetum}
                            onChange={handleChangeTetum('seedGerminationTetum')}
                            sx={{bigFieldSx}}
                        />

                        <TextField fullWidth 
                            label="Pests" 
                            multiline
                            rows={4}
                            value={formDataTetum.pestsTetum}
                            onChange={handleChangeTetum('pestsTetum')}
                            sx={{
                                bigFieldSx
                            }}
                        />
                    </Box>
                    </Box>
                    <Box sx={{ marginTop: 2 }}>
                        <Button variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        >
                            {loading ? 'Adding...' : 'Add Entry'}
                        </Button>
                    </Box>
                </Box>
            )}    

        </Box>

              
               

    )

     
}