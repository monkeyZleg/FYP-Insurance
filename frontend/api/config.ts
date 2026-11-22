/** Where the backend lives. Set NEXT_PUBLIC_BACKEND_URL in frontend/.env.local to change it. */
export const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

/**
 * Failed requests are always logged. Set NEXT_PUBLIC_API_LOG=true in
 * frontend/.env.local to log successful ones too (handy while setting up).
 */
export const LOG_SUCCESS = process.env.NEXT_PUBLIC_API_LOG === "true";
