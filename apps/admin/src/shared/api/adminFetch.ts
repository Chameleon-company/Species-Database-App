import { endAdminSession, readAdminToken } from "./adminSession";

const LOGIN_URL = "/#/admin-login";

/** Thrown after a request found the admin session missing or rejected. */
export class SessionEndedError extends Error {
  constructor() {
    super("Admin session ended");
    this.name = "SessionEndedError";
  }
}

function endSession(): never {
  if (!endAdminSession()) window.location.assign(LOGIN_URL);
  throw new SessionEndedError();
}

/**
 * `fetch` with the stored admin token in `Authorization`.
 *
 * Sets `Content-Type: application/json` unless the body is `FormData`.
 * With no stored token, or on a 401 or 403 response, it ends the session
 * through `endAdminSession` (navigating to the login route itself when no
 * listener handles it) and throws `SessionEndedError`.
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
