import { Alert, Box, Button, IconButton } from "@mui/material"
import { DataGrid, type GridColDef } from "@mui/x-data-grid"
import { useEffect, useState } from "react"
import DeleteIcon from "@mui/icons-material/Delete"
import { adminFetch } from "../utils/adminFetch"
import { translations } from "../translations"

type Media = {
    media_id: number
    species_name: string
    media_type: string
    download_link: string
    alt_text?: string
}

export default function MediaManager() {
    const [lang, setLang] = useState<"en" | "tet">(
        (localStorage.getItem("lang") as "en" | "tet") || "en"
    )
    const t = translations[lang]
    
    const changeLang = (newLang: "en" | "tet") => {
        localStorage.setItem("lang", newLang)
        setLang(newLang)
    }

    const [media, setMedia] = useState<Media[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const API_URL = import.meta.env.VITE_API_BASE

    useEffect(() => {
        fetchMedia()
    }, [])

    const fetchMedia = async () => {
        setLoading(true)
        setError(null)

        try {
            const res = await adminFetch(`${API_URL}/upload-media`, {})
            if (!res.ok) {
                throw new Error(t.failedToLoadMedia)
            }
            const data = await res.json()
            setMedia(Array.isArray(data) ? data : [])
        } catch (err: any) {
            setError(err.message)
            setMedia([])
        } finally {
            setLoading(false)
        }
    }

    const addMedia = () => {
        setMedia((prev) => [
            {
                media_id: Date.now() * -1,
                species_name: "",
                media_type: "",
                download_link: "",
                alt_text: "",
            },
            ...prev,
        ])
    }

    const saveMedia = async (row: Media) => {
        if (!row.species_name || !row.media_type || !row.download_link) {
            setError(t.mediaRequiredFields)
            return
        }

        const isNew = row.media_id < 0

        const url = isNew
            ? `${API_URL}/upload-media`
            : `${API_URL}/upload-media/${row.media_id}`

        const method = isNew ? "POST" : "PUT"

        setLoading(true)
        setError(null)

        try {
            const res = await adminFetch(url, {
                method,
                body: JSON.stringify(row)
            })

            if (!res.ok) {
                const err = await res.json()
                if (res.status === 409) {
                    throw new Error(t.mediaLinkAlreadyRegistered)
                }
                throw new Error(err.error || t.uploadFailed)
            }

            await fetchMedia()
            return
        } catch (err: any) {
            setError(err.message)
            return
        } finally {
            setLoading(false)
        }
    }

    const deleteMedia = async (media_id: number) => {
        if (!window.confirm(t.deleteMediaConfirm)) return

        setLoading(true)
        setError(null)

        try {
            const res = await adminFetch(
                `${API_URL}/upload-media/${media_id}`,
                {
                    method: "DELETE",
                }
            )

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || t.deleteFailed)
            }

            await fetchMedia()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const columns: GridColDef[] = [
        {
            field: "media_id",
            headerName: t.id,
            width: 80,
            valueGetter: (_value, row) =>
                row.media_id < 0 ? t.new : row.media_id
        },
        {
            field: "species_name",
            headerName: t.speciesName,
            width: 220,
            editable: true,
        },
        {
            field: "media_type",
            headerName: t.type,
            width: 120,
            editable: true,
            type: "singleSelect",
            valueOptions: ["image", "video"],
            valueFormatter: (value) => {
                if (value === "image") return t.image
                if (value === "video") return t.video
                return value
            },
        },
        {
            field: "download_link",
            headerName: t.mediaUrl,
            width: 350,
            editable: true,
        },
        {
            field: "alt_text",
            headerName: t.altText,
            width: 200,
            editable: true,
        },
        {
            field: "actions",
            headerName: "",
            width: 80,
            renderCell: (params) => (
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
                }}
            >
               <h2 className="text-3xl font-bold">{t.mediaManagement}</h2>

                <div>
                <button onClick={() => changeLang("en")} style={{ marginRight: "10px" }}>
    EN
</button>
<button onClick={() => changeLang("tet")} style={{ marginRight: "10px" }}>
    TET
</button>

                    <Button variant="contained" onClick={addMedia}>
                        {t.addMedia}
                    </Button>
                </div>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <DataGrid
                rows={media}
                columns={columns}
                getRowId={(row) => row.media_id}
                loading={loading}
                editMode="row"
                processRowUpdate={async (row) => {
                    await saveMedia(row)
                    return row
                }}
                disableRowSelectionOnClick
                sx={{ backgroundColor: "#fff" }}
                onProcessRowUpdateError={(error) => {
                    setError(error.message)
                }}
            />
        </Box>
    )
}