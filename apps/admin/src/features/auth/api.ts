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
  const data = await res.json().catch(() => null);
  if (res.status >= 500 || res.status === 429) throw new Error(`Login unavailable (${res.status})`);
  const token = data?.access_token;
  if (!res.ok || typeof token !== "string" || !token) throw new LoginRejectedError();
  saveAdminToken(token);
}

/**
 * Password login. Stores the access token on success. Throws
 * `LoginRejectedError` for any 4xx refusal (except 429) or a reply without a
 * token, so the page never reveals whether an account exists, is disabled or
 * is Google-only. Throws a plain Error for 5xx, 429 and network failures.
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
