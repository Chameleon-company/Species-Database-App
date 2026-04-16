import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

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

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google login failed");
        localStorage.setItem("admin_token", data.access_token);
        navigate("/");
      } catch {
        setError("Google login failed. Please try again.");
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
      { theme: "outline", size: "large", width: "100%" }
    );
  }, []);

  const loginAdmin = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Admin login failed");
      localStorage.setItem("admin_token", result.access_token);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f4f0;
          font-family: 'DM Sans', sans-serif;
          padding: 16px;
        }

        /* ── Card ── */
        .login-card {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        /* Top white section */
        .card-top {
          background: #ffffff;
          padding: 40px 32px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .logo-wrap {
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }

        .logo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .card-title {
          font-size: 17px;
          font-weight: 700;
          color: #1a2e1a;
          letter-spacing: -0.01em;
          text-align: center;
        }

        /* Bottom green section */
        .card-bottom {
          background: linear-gradient(165deg, #c8e6b0 0%, #a8d580 40%, #7ab84a 100%);
          padding: 24px 28px 32px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Error */
        .error-box {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 14px;
          font-size: 13px;
          color: #b91c1c;
          font-weight: 500;
        }

        /* Field group */
        .field-group {
          margin-bottom: 6px;
        }

        .field-wrap {
          position: relative;
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          margin-bottom: 14px;
        }

        .field-input {
          width: 100%;
          padding: 14px 44px 14px 14px;
          border: none;
          outline: none;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #1a2e1a;
          background: transparent;
        }

        .field-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .field-icon-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: color 0.15s;
        }

        .field-icon-btn:hover { color: #374151; }

        .forgot-link {
          display: block;
          text-align: right;
          font-size: 12px;
          font-weight: 500;
          color: #1a4a1a;
          text-decoration: none;
          margin-top: 5px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: color 0.15s;
        }

        .forgot-link:hover { color: #0f2f0f; text-decoration: underline; }

        /* LOGIN button */
        .login-btn {
          width: 100%;
          padding: 14px;
          background: #2d6a0a;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.18s, transform 0.1s, box-shadow 0.18s;
          box-shadow: 0 4px 14px rgba(45, 106, 10, 0.35);
          margin-top: 4px;
        }

        .login-btn:hover:not(:disabled) {
          background: #245508;
          box-shadow: 0 6px 18px rgba(45, 106, 10, 0.45);
          transform: translateY(-1px);
        }

        .login-btn:active:not(:disabled) { transform: translateY(0); }

        .login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* OR divider */
        .or-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 16px 0;
        }

        .or-line {
          flex: 1;
          height: 1px;
          background: rgba(45, 80, 20, 0.25);
          border: none;
          /* dashed look via repeating gradient */
          background-image: repeating-linear-gradient(
            90deg,
            rgba(45,80,20,0.35) 0px,
            rgba(45,80,20,0.35) 6px,
            transparent 6px,
            transparent 10px
          );
        }

        .or-text {
          font-size: 12px;
          font-weight: 600;
          color: #2d5010;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        /* Google button */
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 13px 16px;
          background: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          color: #374151;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          transition: box-shadow 0.18s, transform 0.1s;
        }

        .google-btn:hover {
          box-shadow: 0 3px 12px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }

        .google-btn:active { transform: translateY(0); }

        .google-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        /* Hide the real Google button div — we render our own */
        #google-login { display: none; }

        /* ── Desktop layout ── */
        @media (min-width: 640px) {
          .login-card {
            max-width: 680px;
            border-radius: 24px;
            display: flex;
            flex-direction: row;
          }

          .card-top {
            width: 44%;
            flex-shrink: 0;
            padding: 48px 28px 48px;
            border-radius: 0;
            justify-content: center;
          }

          .card-bottom {
            flex: 1;
            padding: 36px 32px 36px;
            border-radius: 0;
          }

          .logo-wrap {
            width: 110px;
            height: 110px;
          }
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          {/* ── Top / Left: logo ── */}
          <div className="card-top">
            <div className="logo-wrap">
              <img src={logo} alt="FINI logo" />
            </div>
            <p className="card-title">Authorised Administrators Only</p>
          </div>

          {/* ── Bottom / Right: form ── */}
          <div className="card-bottom">
            {error && <div className="error-box">{error}</div>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginAdmin();
              }}
            >
              {/* Username */}
              <div className="field-group">
                <div className="field-wrap">
                  <input
                    className="field-input"
                    type="text"
                    placeholder="Username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field-group">
                <div className="field-wrap">
                  <input
                    className="field-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="field-icon-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      /* Eye-off */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      /* Eye */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? "Logging in…" : "LOGIN"}
              </button>

              {/* OR divider */}
              <div className="or-divider">
                <div className="or-line" />
                <span className="or-text">OR</span>
                <div className="or-line" />
              </div>

              {/* Custom Google button triggers the hidden div */}
              <button
                type="button"
                className="google-btn"
                onClick={() => {
                  const el = document.getElementById("google-login");
                  if (el) {
                    const btn = el.querySelector('[role="button"]') as HTMLElement | null;
                    if (btn) btn.click();
                  }
                }}
              >
                {/* Google "G" icon */}
                <svg className="google-icon" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Sign In With Google
              </button>

              {/* Hidden real Google button */}
              <div id="google-login" />
            </form>
          </div>
        </div>
      </div>
    </>
  );
}