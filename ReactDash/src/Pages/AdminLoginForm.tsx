import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import logo from "../assets/logo.png";
import { translations } from "../translations";

type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
};

declare global {
  interface Window {
    google: any;
    handleGoogleLogin?: (response: any) => void;
  }
}

export default function AdminLoginForm() {
  const navigate = useNavigate();

  const [lang, setLang] = useState<"en" | "tet">("en");
  const t = translations[lang];

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ name?: boolean; password?: boolean }>({})

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    window.handleGoogleLogin = async (response: GoogleCredentialResponse) => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_URL}/api/auth/google-admin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_token: response.credential,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "google login failed");
        }

        localStorage.setItem("admin_token", data.access_token);
        navigate("/");
      } catch {
        setError("google login failed");
      } finally {
        setLoading(false);
      }
    };

    if (!window.google?.accounts?.id) {
      console.warn("Google Identity not loaded");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: window.handleGoogleLogin,
    });

    window.google.accounts.id.renderButton(
      document.getElementById("google-login"),
      {
        theme: "outline",
        size: "large",
        width: "100%",
      }
    );
  }, [API_URL, navigate]);

  const loginAdmin = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "admin login failed");
      }

      localStorage.setItem("admin_token", result.access_token);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "an error occurred");
    } finally {
      setLoading(false);
    }
  };

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
          minWidth: 360,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <button onClick={() => setLang("en")} style={{ marginRight: "10px" }}>
            EN
          </button>
          <button onClick={() => setLang("tet")}>TET</button>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <img src={logo} alt="logo" style={{ height: 56 }} />
        </Box>

        <Typography
          variant="body2"
          sx={{ textAlign: "center", color: "#294a8b", mb: 4 }}
        >
          {t.adminOnly}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loginAdmin();
          }}
        >
          <TextField
            label={t.username}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            sx={{ mb: 2 }}
            error={touched.name && !name}
            helperText={
                touched.name && !name
                    ? t.nameRequired
                    : ""
            }
          />

          <TextField
          label={t.password}
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          sx={{ mb: 3 }}
          error={touched.password && !password}
          helperText={
              touched.password && !password
                  ? t.passwordRequired
                  : ""
          }
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            onClick={loginAdmin}
            sx={{
              backgroundColor: "#3f7e13",
              "&:hover": { backgroundColor: "#33650f" },
              padding: 1.4,
              fontWeight: 600,
            }}
          >
            {loading ? t.loggingIn : t.login}
          </Button>

          <Typography
            variant="body2"
            sx={{
              my: 2,
              color: "#6b7280",
            }}
          >
            {t.or}
          </Typography>

          <div id="google-login" />
        </form>
      </Box>
    </Box>
  );
}