const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function handle(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.message || err.error || "Request failed");
  }
  return res.json();
}

// Staff requests (verifier / admin / auditor), authenticated with the Bearer
// JWT from the email + password login. Same as apiFetchAuth below; kept as its
// own name because the staff pages import it.
export async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  return apiFetchAuth(path, options, token);
}

// Requests authenticated with the Bearer JWT from login (any role).
export async function apiFetchAuth(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  return handle(res);
}
