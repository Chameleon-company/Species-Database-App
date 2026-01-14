import TheDrawer from '../Components/drawer'
import MainTableSelect from '../mainTableSelect'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import React, { useState } from 'react'
import { TextField } from '@mui/material'
import Alert from '@mui/material/Alert'
import type { Species } from '../mainTableSelect'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import {supabase, supabaseTetum} from '../supabaseClient'







const textFieldBaseSx = {
    '& .MuiInputBase-input': { color: 'white' },
    '& .MuiInputLabel-root': { color: 'white' },
}

const requiredFieldSx = {
    ...textFieldBaseSx,
    '& .MuiFormHelperText-root': { color: 'red' },
    marginRight: 8
}

const requiredFieldSxNoMargin = {
    ...textFieldBaseSx,
    '& .MuiFormHelperText-root': { color: 'red' }
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














export function EditEntry() {
    if (!supabase || !supabaseTetum) {
        return <div>ERROR! Database connection failed!</div>
    }

    const [error, setError] = useState('')
    
    const [loading, setLoading] = useState(false)

    const [status, setStatus] = useState('')

    const [rowSelected, setRowSelected] = useState(false)
    

    const [ID, setID] = useState(-1)

    const [resetKey, setResetKey] = useState(0)

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

    const [open, setOpen] = useState(false)

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
        setLoading(true)
        setStatus('')
        setError('')

        try {
            const { error } = await supabase!
                .from('species_en')
                .delete()
                .eq('species_id', ID)

            if (error) {
                console.error('========== SUPABASE ERROR DETAILS ==========')
                console.error('Error object:', error)
                console.error('Error code:', error.code)
                console.error('Error details:', error.details)
                console.error('Error hint:', error.hint)
                console.error('Full error JSON:', JSON.stringify(error, null, 2))
                console.error('===========================================')
                
                let errorMsg = `Error Code: ${error.code}\n`
                errorMsg += `Message: ${error.message}\n`
                if (error.details) errorMsg += `Details: ${error.details}\n`
                if (error.hint) errorMsg += `Hint: ${error.hint}`
                
                throw new Error(errorMsg)
            }

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
            setStatus(`Error: ${(error as Error).message}`)
        }
        finally {
            setLoading(false)
        }
    }



    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    console.log('handleChange called:', name, value)
    
    setFormData(prev => {
        console.log('Previous state:', prev)
        return {
            ...prev,
            [name]: value
        }
    })
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
            setError(`${emptyField.name} cannot be empty!`)
            return
        }

        setLoading(true)
        setStatus('')
        setError('')

        try {
            const { error } = await supabase!
                .from('species_en')
                .update([
                    { 
                        scientific_name: formData.scientificName,
                        common_name: formData.commonName ,
                        etymology: formData.etymology,
                        habitat: formData.habitat,
                        identification_character: formData.identificationCharacteristics,
                        leaf_type: formData.leafType,
                        fruit_type: formData.fruitType,
                        phenology: formData.phenology,
                        seed_germination: formData.seedGermination,
                        pest: formData.pests 
                    }
                ])
                .eq('species_id', ID)
                .select()

            if (error) {
                console.error('========== SUPABASE ERROR DETAILS ==========')
                console.error('Error object:', error)
                console.error('Error code:', error.code)
                console.error('Error details:', error.details)
                console.error('Error hint:', error.hint)
                console.error('Full error JSON:', JSON.stringify(error, null, 2))
                console.error('===========================================')
                
                let errorMsg = `Error Code: ${error.code}\n`
                errorMsg += `Message: ${error.message}\n`
                if (error.details) errorMsg += `Details: ${error.details}\n`
                if (error.hint) errorMsg += `Hint: ${error.hint}`
                
                throw new Error(errorMsg)
            }

            setResetKey(prev => prev + 1)
            setStatus('Species added successfully!')
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
            setStatus(`Error: ${(error as Error).message}`)
        }

        finally {
            setLoading(false)
        }
    }



    

    const handleRowSelect = (rowData: Species | null) => {
        setStatus('')
        console.log(rowData)
        if (rowData) {
            setID(rowData.species_id)
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
        } else {
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
            setRowSelected(false)
            setID(-1)
        }
    }


    return (
        <>
            <div><TheDrawer></TheDrawer></div>
            <h1>Edit Entry</h1>
            <h4>Select Entry to edit</h4>
            <div><MainTableSelect key={resetKey} onRowSelect={handleRowSelect}></MainTableSelect></div>
            <Box sx={containerBoxSx}>
                {status && (
                    <Alert severity="success">
                        {status}
                    </Alert>
                )}
            </Box>
            


            

            {rowSelected && (
                <Box sx={formContainerSx}>

                    <h4>Edit fields below:</h4>
                    <Box>   
                        <TextField
                            name="scientificName" 
                            label="Scientific Name"
                            helperText="Required"
                            value={formData.scientificName}
                            onChange={handleChange}
                            sx={requiredFieldSx}
                            />

                            <TextField
                            name="commonName"
                            label="Common Name"
                            helperText="Required"
                            value={formData.commonName}
                            onChange={handleChange}
                            sx={requiredFieldSxNoMargin}
                            />

                    
                    </Box>

                    <Box sx={fieldRowSx}>   
                        <TextField
                            name="leafType"
                            label="Leaf Type"
                            helperText="Required"
                            value={formData.leafType}
                            onChange={handleChange}
                            sx={requiredFieldSx}
                            />

                            <TextField
                            name="fruitType"
                            label="Fruit Type"
                            helperText="Required"
                            value={formData.fruitType}
                            onChange={handleChange}
                            sx={requiredFieldSxNoMargin}
                            />

                    
                    </Box>

                    <div><h5>Optional:</h5></div>

                    <Box sx={multilineRowSx}>
                        <TextField 
                            fullWidth 
                            label="Etymology" 
                            name="etymology"
                            multiline
                            rows={4}
                            value={formData.etymology}
                            onChange={handleChange}
                            sx={multilineFieldSx}
                        />

                        <TextField 
                            fullWidth 
                            label="Habitat" 
                            name="habitat"
                            multiline
                            rows={4}
                            value={formData.habitat}
                            onChange={handleChange}
                            sx={multilineFieldSx}
                        />
                    </Box>


                    <Box sx={multilineRowSx}>
                        <TextField fullWidth 
                            label="Identification Characteristics" 
                            name="identificationCharacteristics"
                            multiline
                            rows={4}
                            value={formData.identificationCharacteristics}
                            onChange={handleChange}
                            sx={multilineFieldSx}
                        />

                        <TextField fullWidth 
                            label="Phenology" 
                            name="phenology"
                            multiline
                            rows={4}
                            value={formData.phenology}
                            onChange={handleChange}
                            sx={multilineFieldSx}
                        />
                    </Box>


                    <Box sx={multilineRowSx}>
                        <TextField fullWidth 
                            label="Seed Germination" 
                            name="seedGermination"
                            multiline
                            rows={4}
                            value={formData.seedGermination}
                            onChange={handleChange}
                            sx={multilineFieldSx}
                        />

                        <TextField fullWidth 
                            label="Pests" 
                            name="pests"
                            multiline
                            rows={4}
                            value={formData.pests}
                            onChange={handleChange}
                            sx={multilineFieldSx}
                        />
                    </Box>
                    
                    <Box sx={errorContainerSx}>
                        {error && (
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}

                    </Box>



                    <Box>
                        <Button variant="contained"
                            onClick={handleSubmit}
                        >
                            {loading ? 'Editing...' : 'Push edit'}
                        </Button>
                    </Box>

                    <Box sx={{ marginTop: 2 }}>
                        <Button 
                            variant="contained" 
                            color="error"
                            onClick={handleClickOpen}
                        >
                            {loading ? 'Editing...' : 'Delete Entry'}
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