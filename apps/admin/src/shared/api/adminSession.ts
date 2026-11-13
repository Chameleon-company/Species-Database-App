const TOKEN_KEY = "admin_token";
const ROLE_KEY = "admin_role";

export function readAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)?.trim() || null;
}

export function hasAdminSession(): boolean {
  return readAdminToken() !== null;
}

export function saveAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

type SessionEndListener = () => void;
const sessionEndListeners = new Set<SessionEndListener>();

/** Subscribes to forced session ends. Returns the unsubscribe function. */
export function onSessionEnd(listener: SessionEndListener): () => void {
  sessionEndListeners.add(listener);
  return () => {
    sessionEndListeners.delete(listener);
  };
}

/**
 * Clears the session and notifies `onSessionEnd` listeners.
 * Returns false when nothing listens, so the caller must navigate itself.
 */
export function endAdminSession(): boolean {
  clearAdminSession();
  sessionEndListeners.forEach((listener) => listener());
  return sessionEndListeners.size > 0;
}

/**
 * Revokes the session on the API, then clears it locally.
 * The local session is cleared even when the API call fails.
 */
export async function logoutAdmin(apiBase: string): Promise<void> {
  const token = readAdminToken();
  try {
    if (token) {
      await fetch(`${apiBase.replace(/\/+$/, "")}/api/auth/admin-logout`, {
        method: "POST",
        headers: { Authorization: token },
      });
    }
  } catch {
    return;
  } finally {
    clearAdminSession();
  }
}
