import { ApiError, type ApiResult } from "./client";
import { logApiError, logApiOk } from "./logger";

/**
 * The try/catch every controller shares: runs the request, logs it under
 * `name`, and turns a thrown error into { ok: false, error, status }.
 */
export async function run<T>(name: string, call: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    const data = await call();
    logApiOk(name);
    return { ok: true, data };
  } catch (error) {
    logApiError(name, error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong",
      status: error instanceof ApiError ? error.status : 0,
    };
  }
}
