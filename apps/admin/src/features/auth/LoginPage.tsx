import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@sda/ui/components/alert";
import { Button } from "@sda/ui/components/button";
import { Input } from "@sda/ui/components/input";
import logo from "../../assets/logo.png";
import LanguageSwitch from "../../shared/ui/LanguageSwitch";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { LoginRejectedError, useGoogleLogin, usePasswordLogin } from "./api";
import { clickGoogleButton, mountGoogleButtonWhenReady } from "./googleIdentity";

function GoogleMark() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const fieldClass = "h-12 rounded-lg border-0 bg-card px-3.5 text-sm shadow-sm placeholder:text-faint focus-visible:ring-primary/30";

export default function LoginPage() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const navigate = useNavigate();
  const passwordLogin = usePasswordLogin();
  const googleLogin = useGoogleLogin();
  const googleRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = passwordLogin.isPending || googleLogin.isPending;

  const onGoogleCredential = useEffectEvent((idToken: string) => {
    setError(null);
    googleLogin.mutate(idToken, {
      onSuccess: () => navigate("/"),
      onError: () => setError(t("googleLoginFailed")),
    });
  });

  useEffect(() => {
    if (!googleRef.current) return;
    return mountGoogleButtonWhenReady(googleRef.current, onGoogleCredential);
  }, []);

  const submit = () => {
    setError(null);
    passwordLogin.mutate(
      { name, password },
      {
        onSuccess: () => navigate("/"),
        onError: (err) => setError(t(err instanceof LoginRejectedError ? "adminLoginFailed" : "somethingWentWrong")),
      }
    );
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full overflow-hidden rounded-3xl shadow-card sm:flex sm:max-w-170">
        <div className="flex flex-col items-center justify-center gap-1 bg-card px-8 pt-10 pb-7 sm:w-[44%] sm:shrink-0 sm:px-7 sm:py-12">
          <img src={logo} alt="FINI logo" className="mb-1 size-22.5 object-contain sm:size-27.5" />
          <p className="text-center text-lg font-bold text-balance text-foreground">{t("loginSubtitle")}</p>
        </div>

        <div className="flex flex-1 flex-col bg-linear-to-b from-brand-soft via-brand-light to-brand-leaf px-7 pt-6 pb-8 sm:px-8 sm:py-9">
          <div className="mb-4 flex justify-end">
            <LanguageSwitch />
          </div>

          {error && (
            <Alert variant="destructive" className="mb-3.5 rounded-lg border-destructive/30 bg-destructive-soft py-2.5">
              <AlertDescription className="text-compact font-medium text-destructive-hover">{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex flex-col gap-3.5"
          >
            <Input
              className={fieldClass}
              placeholder={t("username")}
              aria-label={t("username")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
            />
            <div className="relative">
              <Input
                className={`${fieldClass} pr-11`}
                type={showPassword ? "text" : "password"}
                placeholder={t("password")}
                aria-label={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-icon hover:text-body"
              >
                {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </div>
            <Button type="submit" disabled={pending} className="mt-1 h-12 w-full tracking-[0.08em] uppercase">
              {passwordLogin.isPending ? t("loggingIn") : t("login")}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-2.5">
            <span className="h-px flex-1 border-t border-dashed border-brand-text/40" />
            <span className="text-label text-brand-text">{t("or")}</span>
            <span className="h-px flex-1 border-t border-dashed border-brand-text/40" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => clickGoogleButton(googleRef.current)}
            disabled={pending}
            className="h-12 w-full gap-2.5 border-0 bg-card text-sm text-body shadow-sm hover:bg-card hover:text-foreground"
          >
            <GoogleMark />
            {t("signInWithGoogle")}
          </Button>
          <div ref={googleRef} hidden />
        </div>
      </div>
    </div>
  );
}
