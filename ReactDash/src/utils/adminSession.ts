/** Single place for admin auth token reads and clearing. */

export function hasAdminSession(): boolean {
  const t = localStorage.getItem("admin_token");
  return Boolean(t?.trim());
}

export function clearAdminSession(): void {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_role");
}
