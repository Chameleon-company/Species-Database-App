import { useMutation } from "@tanstack/react-query";
import { saveAdminToken } from "../../shared/api/adminSession";

const API_BASE = import.meta.env.VITE_API_BASE;

async function requestToken(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "");
  saveAdminToken(data.access_token);
}

/** Password login. Stores the access token on success; throws with the API error text, or an empty message, otherwise. */
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
