const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function handle(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.message || err.error || "Request failed");
  }
  return res.json();
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  walletAddress?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (walletAddress) {
    headers["x-wallet-address"] = walletAddress;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  return handle(res);
}

// Policyholder-facing requests: authenticated with a Bearer JWT instead of
// the staff x-wallet-address header. Used for /api/policies and
// /api/claims routes reached by a policyholder session.
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
