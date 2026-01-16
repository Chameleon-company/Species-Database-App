import { Alert, Box, Button, IconButton, TextField } from "@mui/material"
import { DataGrid, type GridColDef } from "@mui/x-data-grid"
import { useEffect, useState } from "react"
import DeleteIcon from "@mui/icons-material/Delete"


type Media = {
    media_id: number
    species_name: string
    media_type: string
    download_link:string
    alt_text?: string
}

export default function MediaManager() {
    const [media, setMedia] =useState<Media[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    //load media when page opens
    useEffect(() => {
        fetchMedia()
    }, [])

    const fetchMedia = async()=> {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem("admin_token")

        try {
            const res = await fetch("http://127.0.0.1:5000/upload-media",
            {
                headers: {
                    Authorization: token || "",
                },
            })
            if (!res.ok) {
                throw new Error("Failed to load media")
            }
            const data = await res.json()
            setMedia(Array.isArray(data) ? data : [])
        }
        catch (err: any) {
            setError(err.message)
            setMedia([])
        }
        finally {
            setLoading(false)
        }
    }

    //add black row
    const addMedia =()=> {
        setMedia((prev) => [
            {
                media_id:Date.now() * -1, //temp id
                species_name: "",
                media_type: "",
                download_link: "",
                alt_text: "",
            },
            ...prev,
        ])
    }

    //saving row to backend
    const saveMedia = async (row:Media) => {
        const token = localStorage.getItem("admin_token")

        if (!row.species_name || !row.media_type || !row.download_link)
        {
            setError("species_name, media_type and download_link required")
            return
        }

        const isNew= row.media_id < 0

        const url = isNew
        ? "http://127.0.0.1:5000/upload-media"
        : `http://127.0.0.1:5000/upload-media/${row.media_id}`

        const method = isNew ? "POST" : "PUT"

        setLoading(true)
        setError(null)

        try {
            const res = await fetch(url, {

                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token || "",
                },
                body: JSON.stringify(row)
            })
            if(!res.ok)
            {
                const err = await res.json()
                    if (res.status === 409) {
                        throw new Error("This media link is already registered");
                    }
                throw new Error(err.error || "Upload failed")
            }

            await fetchMedia()
            return
        }
        catch (err: any)
        {
            setError(err.message)
            return
        }
        finally {
            setLoading(false)
        }
    }

    const deleteMedia = async (media_id: number) => {
        const token = localStorage.getItem("admin_token")
        if(!window.confirm("delete this media item?")) return

        setLoading(true)
        setError(null)
        try{
            const res = await fetch(
                `http://127.0.0.1:5000/upload-media/${media_id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: token || "",
                    }
                }
            )
            if(!res.ok)
            {
                const err = await res.json()
                throw new Error(err.error || "delete failed")
            }
            await fetchMedia()
        }
        catch(err: any)
        {
            setError(err.message)
        }
        finally{
            setLoading(false)
        }
    }

    //table columns
    const columns: GridColDef[] = [
        {
            field: "media_id",
            headerName: "ID",
            width: 80,
            valueGetter: (_value, row) =>
                row.media_id < 0 ? "New" : row.media_id
        },
        {
            field: "species_name",
            headerName: "Species name",
            width: 220,
            editable: true,
                   
        },
        {
            field: "media_type",
            headerName: "Type",
            width: 120,
            editable: true,
            type: "singleSelect",
            valueOptions: ["image", "video"],
        },
        {
            field: "download_link",
            headerName: "Media URL",
            width: 350,
            editable: true,
        },
        {
            field: "alt_text",
            headerName: "Alt text",
            width: 200,
            editable: true,
        },
        {
            field:"actions",
            headerName: "",
            width: 80,
            renderCell: (params) =>  (
                <IconButton color="error" onClick={() => deleteMedia(params.row.media_id)}>
                    <DeleteIcon />
                </IconButton>
            )
        }
    ]

    return (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
            }}>
                <h2>Media Management</h2>
                <Button variant="contained" onClick={addMedia}>
                    Add Media
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{mb: 2}}>
                    {error}
                </Alert>
            )}

            <DataGrid
                rows={media}
                columns={columns}
                getRowId={((row) => row.media_id)}
                loading={loading}
                editMode="row"
                processRowUpdate={async (row) => {
                    await saveMedia(row)
                    return row
                }}
                disableRowSelectionOnClick
                sx={{backgroundColor: "#fff"}}
                onProcessRowUpdateError={(error) => {
                    setError(error.message)
                }}
            />
        </Box>
        
    )
}