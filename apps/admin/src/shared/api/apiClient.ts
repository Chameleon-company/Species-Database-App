import { SessionEndedError, adminFetch } from "./adminFetch";

const API_BASE = import.meta.env.VITE_API_BASE;
const API_URL = import.meta.env.VITE_API_URL;

export const rootUrl = (path: string) => `${API_BASE}${path}`;
export const apiUrl = (path: string) => `${API_URL}${path}`;

/** HTTP failure. `status` is 0 when no response arrived. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  json?: unknown;
  form?: FormData;
};

/**
 * Sends an authenticated request through `adminFetch` and returns the parsed
 * JSON body, or `null` when the body is not JSON.
 *
 * Throws `ApiError` on a non-2xx status, with the body's `error` or `detail`
 * text as the message (falling back to the status text), with status 401
 * when the session ended, and with status 0 when no response arrived.
 */
export async function requestJson<T>(
  url: string,
  { method = "GET", json, form }: RequestOptions = {}
): Promise<T> {
  let res: Response;
  try {
    res = await adminFetch(url, {
      method,
      body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
    });
  } catch (error) {
    if (error instanceof SessionEndedError) throw new ApiError(401, error.message);
    throw new ApiError(0, error instanceof Error ? error.message : String(error));
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error || body?.detail || res.statusText);
  }
  return body as T;
}
