import { API_URL } from "./config";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** A route is just a method and a path. Routes live in ./routes. */
export interface Route {
  method: HttpMethod;
  path: string;
}

/** Who is calling: a policyholder's JWT, a staff member's wallet, or nobody (public routes). */
export type Auth = { token: string } | { wallet: string } | undefined;

/** What every controller returns, so a page can check `result.ok` instead of writing try/catch. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public method: string,
    public url: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Sends one request and returns the parsed JSON, or throws an ApiError.
 * status 0 means the request never reached the backend (it is off, the URL
 * is wrong, or CORS blocked it).
 */
export async function send<T>(route: Route, options: { auth?: Auth; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const { auth, body, query } = options;
  const qs = query ? "?" + new URLSearchParams(query).toString() : "";
  const url = `${API_URL}${route.path}${qs}`;

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {};
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (auth && "token" in auth) headers.Authorization = `Bearer ${auth.token}`;
  if (auth && "wallet" in auth) headers["x-wallet-address"] = auth.wallet;

  let res: Response;
  try {
    res = await fetch(url, {
      method: route.method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Cannot reach the backend at ${API_URL}. Is it running?`, 0, route.method, url);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message || data?.error || `Request failed (${res.status})`, res.status, route.method, url);
  }
  return data as T;
}
