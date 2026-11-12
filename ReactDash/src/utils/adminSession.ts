/** Single place for admin auth token reads and clearing. */

export function hasAdminSession(): boolean {
  const t = localStorage.getItem("admin_token");
  return Boolean(t?.trim());
}

export function clearAdminSession(): void {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_role");
}

export async function logoutAdmin(apiBase: string): Promise<void> {
  const token = localStorage.getItem("admin_token");
  const normalizedBase = apiBase.replace(/\/+$/, "");

  try {
    if (token?.trim()) {
      await fetch(`${normalizedBase}/api/auth/admin-logout`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
      });
    }
  } catch {
    // Local logout must still succeed if the server is unavailable.
  } finally {
    clearAdminSession();
  }
}
