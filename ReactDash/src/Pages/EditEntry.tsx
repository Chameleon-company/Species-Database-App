import TheDrawer from '../Components/drawer'
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





const API_URL = import.meta.env.VITE_API_URL

const API_BASE = import.meta.env.VITE_API_BASE

const textFieldBaseSx = {
    '& .MuiInputBase-input': { color: 'white' },
    '& .MuiInputLabel-root': { color: 'white' },
}

const requiredFieldSx = {
    ...textFieldBaseSx,
    '& .MuiFormHelperText-root': { color: 'red' },
    marginRight: 8,
    marginTop: 4
}

const requiredFieldSxNoMargin = {
    ...textFieldBaseSx,
    '& .MuiFormHelperText-root': { color: 'red' },
    marginTop: 4
}

const multilineFieldSx = {
    ...textFieldBaseSx,
}

const formContainerSx = { 
    width: '100%', 
    paddingX: 0 
}

const fieldRowSx = { 
    marginTop: 2 
}

const containerBoxSx = { 
    marginTop: 2, 
    width: '30%', 
    paddingX: 0, 
    marginX: 'auto' 
}

const multilineRowSx = { 
    display: 'flex', 
    gap: 1, 
    marginTop: 3, 
    marginBottom: 3, 
    maxWidth: '70%', 
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
  },
}

export function EditEntry() {
    const { id } = useParams<{ id: string }>();

    //Used for errors that are a result of interactions with database
    const [error, setError] = useState('')
    //Used for errors that result from pressing upload button
    const [uploadError, setUploadError] = useState('')
    //To change text / disable buttons when things are loading in background
    const [loading, setLoading] = useState(false)
    //Used to disable delete button when deletion is in progress
    const [deleteLoading, setDeleteLoading] = useState(false)
    //Displays success messages
    const [status, setStatus] = useState('')
    //Keeps track of which row is selected
    const [rowSelected, setRowSelected] = useState(false)
    //Keeps track of the ID of the row selected (used to fetch Tetum row)
    const [ID, setID] = useState(-1)

    const [, setResetKey] = useState(0)
    //Keep track of if a translation has been made (used to change text display)
    const [translated, setTranslated] = useState(false)
    //Disables the translate button
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

    //const [tetumRowError, setTetumRowError] = useState(false)
    const [, setTetumRowError] = useState(false)

    const [open, setOpen] = useState(false)


    // async function fetchTet() {
    //     try{
    //         const res = await adminFetch(`${import.meta.env.VITE_API_URL}/bundle`)
    //         if(!res.ok) throw new Error("Failed to fetch bundle")
            
    //         const data = await res.json()

    //         console.log("Loaded tetum rows:", data.species_tet)
    //         setSpeciesTet(data.species_tet ?? [])
    //     }
    //     catch (err)
    //     {
    //         console.error("tetum failed to load from bundle", err)
    //         setSpeciesTet([])
    //     }
    // }

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
            
            if(!res.ok)
            {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'failed to delete species')
            }

            //*
            setResetKey(prev => prev + 1)
            setStatus('Species deleted successfully!')
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
        
        setFormData(prev => {
            console.log('Previous state:', prev)
            return {
                ...prev,
                [name]: value
            }
        })
    }   

    const handleChangeTetum = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target
        
        setFormDataTetum(prev => {
            console.log('Previous state:', prev)
            return {
                ...prev,
                [name]: value
            }
        })
    }   


    const handleTranslate = async () => {
        ///we want to generate a new tet version for this one
        resetTet()
        setTranslated(false)
        setError('')
        setTranslateLoading(true)

        let hasError = false

        if (!formData.scientificName) {setError('Scientific Name Cannot be empty'), hasError = true}
        else if (!formData.commonName) {setError('Common Name Cannot be empty'), hasError = true}
        else if (!formData.leafType) {setError('Leaf Type Cannot be empty'), hasError = true}
        else if (!formData.fruitType) {setError('Fruit Type Cannot be empty'), hasError = true}
        if(hasError)
        {
            setTranslateLoading(false)
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
            setTranslated(true)
        }
        catch(err) {
            console.error('Translation error:', err)
            setError("translation failed")
        }
        finally {
            setTranslateLoading(false)
        }
    }


    const handleSubmit = async () => {

        const requiredFields = [
            { value: formData.scientificName, name: 'Scientific Name' },
            { value: formData.commonName, name: 'Common Name' },
            { value: formData.leafType, name: 'Leaf Type' },
            { value: formData.fruitType, name: 'Fruit Type' }
        ]

        const emptyField = requiredFields.find(field => !field.value)

        if (emptyField) {
            setUploadError(`${emptyField.name} cannot be empty!`)
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
                    common_name: formData.commonName ,
                    etymology: formData.etymology,
                    habitat: formData.habitat,
                    identification_character: formData.identificationCharacteristics,
                    leaf_type: formData.leafType,
                    fruit_type: formData.fruitType,
                    phenology: formData.phenology,
                    seed_germination: formData.seedGermination,
                    pest: formData.pests,

                    scientific_name_tetum: formDataTetum.scientificNameTetum,
                    common_name_tetum: formDataTetum.commonNameTetum ,
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

            if(!res.ok)
            {
                const err = await res.json().catch(() => ({}))
                let text = "Error, entries failed to upload: " + err.error
                setUploadError(text)
                throw new Error(err.error || 'Update failed')
            }
            const data = await res.json()
            console.log('update response:', data)

            //species updated successfullty in db
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

    //clears all tet fields... used for db row fields to load and when user clicks translate
    const resetTet =() => {
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

    const handleRowSelect = async (rowData: Species | null) => {
        setStatus('')
        console.log(rowData)
        setError('')
        setTranslated(false)
        let rowID = 0

        if(!rowData)
        {
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
        
        //First we attempt to get english row, if successful attempt to fetch tetum row. 
        rowID = rowData.species_id
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

        //Fetch tetum row
        try {
            const tetumRow = speciesTet.find(
                r => r.species_id === rowID
            )
            if(!tetumRow)
            {
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
            setError("Error loading Tetum row. Does a tetum entry exist for this species??")
        }

    }
    //runs when edit page loads
    //autoloads species if ID exists in URL
    useEffect(() => {

        //load one species based on id from url
        async function loadSpecies() {
            //if no id in url, nothing done
            if(!id) return
            try {

                //load tetum bundle
                const bundRes = await adminFetch(`${API_URL}/bundle`)
                if(!bundRes) throw new Error("failed to load bundle")
                const bundle = await bundRes.json()
                const tetList = bundle.species_tet ?? []

                //load english row by id
                const res =await adminFetch(`${API_URL}/species/${id}`, {

                })

                if(!res.ok){
                    throw new Error(`failed to load species`)
                }

                //backend returns eng species row
                const species = await res.json()

                //set tet first
                setSpeciesTet(tetList)

                //populating form and showing fields
                handleRowSelect(species)
            }
            catch(err){
                console.error("failed loading species for editting", err)
                setError("Failed to load species")
            }
        }
        loadSpecies()
    }, [id])

    return (
        <>
            <div><TheDrawer></TheDrawer></div>
            <h1>Edit Entry</h1>
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
                            sx={{...bigFieldSx ,maxWidth: 280 }}
                            name="scientificName" 
                            label="Scientific Name"
                            value={formData.scientificName}
                            onChange={handleChange}
                            onBlur={() =>markTouched('scientificName')}
                            required
                            error={touched.scientificName && !formData.scientificName}
                            helperText={
                            touched.scientificName && !formData.scientificName
                                ? 'Required'
                                : ' '
                            }                            
                            />

                            <TextField
                            sx={{...bigFieldSx ,maxWidth: 280 }}
                            name="commonName"
                            label="Common Name"
                            error={touched.commonName && !formData.commonName}
                            helperText={
                            touched.commonName && !formData.commonName
                                ? 'Required'
                                : ' '
                            }
                            required
                            onBlur={() => markTouched('commonName')}                          
                            value={formData.commonName}
                            onChange={handleChange}
                            />  
                    </Box>

                    <Box display="flex" gap={2} mb={2} justifyContent={"center"}>   
                        <TextField
                            sx={{ ...bigFieldSx ,maxWidth: 280 }}
                            name="leafType"
                            label="Leaf Type"
                            value={formData.leafType}
                            onChange={handleChange}
                            onBlur={() => markTouched('leafType')}
                            required
                            error={touched.leafType && !formData.leafType}
                            helperText={
                            touched.leafType && !formData.leafType
                                ? 'Required'
                                : ' '
                            }
                            />

                            <TextField                            
                            sx={{ ...bigFieldSx ,maxWidth: 280 }}
                            name="fruitType"
                            label="Fruit Type"
                            value={formData.fruitType}
                            onChange={handleChange}
                            onBlur={() => markTouched('fruitType')}
                            required
                            error={touched.fruitType && !formData.fruitType}
                            helperText={
                            touched.fruitType && !formData.fruitType
                                ? 'Required'
                                : ' '
                            }
                            />
                    </Box>
                    <Box display="flex" gap={2} mb={2}>
                        <TextField 
                            fullWidth 
                            label="Etymology" 
                            name="etymology"
                            multiline
                            rows={4}
                            value={formData.etymology}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />

                        <TextField 
                            fullWidth 
                            label="Habitat" 
                            name="habitat"
                            multiline
                            rows={4}
                            value={formData.habitat}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />
                    </Box>
                    <Box display="flex" gap={2} mb={2}>
                        <TextField fullWidth 
                            label="Identification Characteristics" 
                            name="identificationCharacteristics"
                            multiline
                            rows={4}
                            value={formData.identificationCharacteristics}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />

                        <TextField fullWidth 
                            label="Phenology" 
                            name="phenology"
                            multiline
                            rows={4}
                            value={formData.phenology}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />
                        </Box>
                    <Box display="flex" gap={2} mb={2}>
                        <TextField fullWidth 
                            label="Seed Germination" 
                            name="seedGermination"
                            multiline
                            rows={5}
                            value={formData.seedGermination}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />

                        <TextField fullWidth 
                            label="Pests" 
                            name="pests"
                            multiline
                            rows={5}
                            value={formData.pests}
                            onChange={handleChange}
                            sx={bigFieldSx}
                        />
                    </Box>                   
                   <Box>
                        <Button variant="contained"
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
                    {translated && (
                        <h2 style={{ fontSize: '1.5rem'}} >Translated Tetum Entry</h2>
                    )}
                    {!translated && (
                        <h2 style={{ fontSize: '1.5rem' }} >Original Tetum Entry</h2>
                    )}
                
                    <h3>Please check fields to ensure correct translation:</h3>
                    <Box display="flex" gap={2} mb={2} justifyContent={"center"}>   
                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label="Scientific Name"
                            name="scientificNameTetum"
                            value={formData.scientificName}
                            disabled
                            />
                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label="Common Name"
                            name="commonNameTetum"
                            value={formDataTetum.commonNameTetum}
                            onChange={handleChangeTetum}
                            onBlur={() => markTouched('commonName')}
                            required
                            error={touched.commonNameTetum && !formDataTetum.commonNameTetum}
                            helperText={
                                touched.commonNameTetum && !formDataTetum.commonNameTetum
                                ? 'Required'
                                : ' '
                            }
                        />
                    </Box>

                    <Box display="flex" gap={2} mb={2} justifyContent={"center"}>   

                        <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label="Leaf Type"
                            name="leafTypeTetum"
                            value={formDataTetum.leafTypeTetum}
                            onChange={handleChangeTetum}
                            onBlur={() => markTouched('leafTypeTetum')}
                            required
                            error={touched.leafTypeTetum && !formDataTetum.leafTypeTetum}
                            helperText={
                                touched.leafTypeTetum && !formDataTetum.leafTypeTetum
                                ? 'Required'
                                : ' '
                            }                            />

                            <TextField
                            sx={{ ...bigFieldSx, maxWidth: 280 }}
                            label="Fruit Type"
                            name="fruitTypeTetum"
                            value={formDataTetum.fruitTypeTetum}
                            onChange={handleChangeTetum}
                            onBlur={() => markTouched('fruitTypeTetum')}
                            required
                            error={touched.fruitTypeTetum && !formDataTetum.fruitTypeTetum}
                            helperText={
                                touched.fruitTypeTetum && !formDataTetum.fruitTypeTetum
                                ? 'Required'
                                : ' '
                            }
                            />
                    
                    </Box>

                    <div><h5>Optional:</h5></div>

                    <Box display="flex" gap={2} mb={2}>
                        <TextField 
                            fullWidth 
                            label="Etymology" 
                            name="etymologyTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.etymologyTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />

                        <TextField 
                            fullWidth 
                            label="Habitat" 
                            name="habitatTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.habitatTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />
                    </Box>


                    <Box display="flex" gap={2} mb={2}>
                        <TextField fullWidth 
                            label="Identification Characteristics" 
                            name="identificationCharacteristicsTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.identificationCharacteristicsTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />

                        <TextField fullWidth 
                            label="Phenology" 
                            name="phenologyTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.phenologyTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />
                    </Box>


                    <Box display="flex" gap={2} mb={2}>
                        <TextField fullWidth 
                            label="Seed Germination" 
                            name="seedGerminationTetum"
                            multiline
                            rows={4}
                            value={formDataTetum.seedGerminationTetum}
                            onChange={handleChangeTetum}
                            sx={bigFieldSx}
                        />

                        <TextField fullWidth 
                            label="Pests" 
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
                        <Button variant="contained"
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
            
            <Dialog open={open} onClose={handleClose} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Delete Species Entry?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Are you sure you want to delete "{formData.commonName}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

        </>
    )
}