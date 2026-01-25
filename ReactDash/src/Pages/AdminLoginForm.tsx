import {useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box"
import  TextField from "@mui/material/TextField";
import  Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert"

import logo from "../assets/logo.png"
import Button from "@mui/material/Button";

export default function AdminLoginForm()
{
    const navigate = useNavigate();

    const [name, setName] = useState("")
    const [password, setPassword] = useState("")
    //ui state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const API_URL = import.meta.env.VITE_API_BASE;

    //runs when the admin clicks login
    const loginAdmin = async () => {
        setError(null)
        setLoading(true)

        try {
            const response = await fetch(
                `${API_URL}/api/auth/admin-login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name, password,
                    }),
                }
            )
            const result = await response.json()
            if(!response.ok)
            {
                throw new Error(result.error || "admin login failed")
            }
            //store admin token... used for admin only requests
            localStorage.setItem("admin_token", result.access_token)

            //go to admin area
            navigate("/")
        }
        catch(err: any)
        {
            setError(err.message || "an error occurred")
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <Box
            sx={{
                minHeight: "100vh",
                backgroundColor: "#f2f2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 2,
            }}
        >
            <Box
                sx={{
                    backgroundColor: "#ffffff",
                    padding: "32px 24px 16px",
                    textAlign: "center",
                }}
            >
                <Box
                    sx ={{
                        display: "flex", 
                        justifyContent: "center", 
                        mb: 2
                    }}
                >
                    <img src={logo} alt="logo" style={{height: 56}}/>
                </Box>
                <Typography
                    variant="body2"
                    sx={{textAlign: "center", color: "#6b7280", mb: 4}}
                >
                    Authorised Admins Only
                </Typography>
                {error && (
                    <Alert severity="error" sx={{mb:2}}>
                        {error}
                    </Alert>
                )}

                <TextField
                    label="Username"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{mb:2}}
                />
                <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    sx={{mb:3}}
                />
                <Button
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    onClick={loginAdmin}
                    sx={{
                        backgroundColor: "#3f7e13",
                        "&:hover":{backgroundColor: "#33650f"},
                        padding: 1.4,
                        fontWeight: 600
                    }}
                >
                    {loading ? "Logging you in..." : "LOGIN"}
                </Button>
            </Box>
        </Box>
    )
}