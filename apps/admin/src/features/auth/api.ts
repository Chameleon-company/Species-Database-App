import { useMutation } from "@tanstack/react-query";
import { saveAdminToken } from "../../shared/api/adminSession";

const API_BASE = import.meta.env.VITE_API_BASE;

/** The API answered but did not grant a session. */
export class LoginRejectedError extends Error {
  constructor() {
    super("Login rejected");
    this.name = "LoginRejectedError";
  }
}

async function requestToken(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.access_token !== "string" || !data.access_token) throw new LoginRejectedError();
  saveAdminToken(data.access_token);
}

/**
 * Password login. Stores the access token on success. Throws
 * `LoginRejectedError` for any refusal, so the page never reveals whether an
 * account exists, is disabled or is Google-only; other errors are network failures.
 */
export const usePasswordLogin = () =>
  useMutation({
    mutationFn: ({ name, password }: { name: string; password: string }) =>
      requestToken("/api/auth/admin-login", { name, password }),
  });

/** Google login with a Google Identity credential. Stores the access token on success. */
export const useGoogleLogin = () =>
  useMutation({
    mutationFn: (idToken: string) => requestToken("/api/auth/google-admin", { id_token: idToken }),
  });
