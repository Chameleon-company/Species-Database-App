/** Single place for admin auth token reads and clearing. */

/** Origin of the API server (no trailing slash), for auth routes under /api/auth/… */
function adminServerOrigin(): string | undefined {
  const base = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
  if (base) return base.replace(/\/$/, "");
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (apiUrl) {
    const u = apiUrl.replace(/\/$/, "");
    if (u.endsWith("/api")) return u.slice(0, -4);
  }
  return undefined;
}

export function hasAdminSession(): boolean {
  const t = localStorage.getItem("admin_token");
  return Boolean(t?.trim());
}

export function clearAdminSession(): void {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_role");
}

/** Revoke server-side session if possible, then clear local storage (explicit logout). */
export async function performAdminLogout(): Promise<void> {
  const token = (localStorage.getItem("admin_token") || "").trim();
  const origin = adminServerOrigin();
  if (token && origin) {
    try {
      await fetch(`${origin}/api/auth/admin-logout`, {
        method: "POST",
        headers: { Authorization: token },
      });
    } catch {
      // Offline or network failure: still clear client session
    }
  }
  clearAdminSession();
}
