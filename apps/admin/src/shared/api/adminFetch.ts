import { clearAdminSession, readAdminToken } from "./adminSession";

const LOGIN_URL = "/#/admin-login";

function endSession(reason: string): never {
  clearAdminSession();
  window.location.href = LOGIN_URL;
  throw new Error(reason);
}

/**
 * `fetch` with the stored admin token in `Authorization`.
 *
 * Sets `Content-Type: application/json` unless the body is `FormData`.
 * With no stored token, or on a 401 or 403 response, it clears the session,
 * navigates to the login route and throws.
 */
export async function adminFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = readAdminToken();
  if (!token) endSession("Admin not authenticated");

  const isFormData = init.body instanceof FormData;
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: token,
    },
  });

  if (res.status === 401 || res.status === 403) endSession("Admin session expired");
  return res;
}
