import { clearAdminSession, readAdminToken } from "./adminSession";

const LOGIN_URL = "/#/admin-login";

/** Thrown after the session ended and a reload to the login route started. */
export class SessionEndedError extends Error {
  constructor() {
    super("Admin session ended");
    this.name = "SessionEndedError";
  }
}

function endSession(): never {
  clearAdminSession();
  window.location.assign(LOGIN_URL);
  window.location.reload();
  throw new SessionEndedError();
}

/**
 * `fetch` with the stored admin token in `Authorization`.
 *
 * Sets `Content-Type: application/json` unless the body is `FormData`.
 * With no stored token, or on a 401 or 403 response, it clears the session,
 * reloads the app on the login route (dropping all cached data) and throws
 * `SessionEndedError`.
 */
export async function adminFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = readAdminToken();
  if (!token) endSession();

  const isFormData = init.body instanceof FormData;
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: token,
    },
  });

  if (res.status === 401 || res.status === 403) endSession();
  return res;
}
