import { LOG_SUCCESS } from "./config";

/** Every controller logs under its own name, e.g. "auth.loginPolicyholder". */
export function logApiError(name: string, error: unknown, extra?: Record<string, unknown>) {
  const e = error as { status?: number; method?: string; url?: string; message?: string };
  console.error(`[api:${name}] FAILED`, {
    status: e?.status,
    method: e?.method,
    url: e?.url,
    message: e?.message ?? String(error),
    ...extra,
  });
}

export function logApiOk(name: string) {
  if (LOG_SUCCESS) console.info(`[api:${name}] ok`);
}
