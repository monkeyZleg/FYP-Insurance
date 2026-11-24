/*
 * Frontend API layer, in three steps:
 *   routes/       the method and path of every backend endpoint
 *   controllers/  one function per endpoint, each with its own try/catch and log name
 *   client.ts     the one place that calls fetch
 *
 * Pages import from here:
 *   import { authApi } from "@/api";
 *   const result = await authApi.login(email, password, "policyholder");
 *   if (!result.ok) return setError(result.error);   // also logged in the console as [api:auth.login]
 *   result.data.token ...
 */
export * from "./client";
export * as authApi from "./controllers/auth.controller";
export * as policiesApi from "./controllers/policies.controller";
export * as claimsApi from "./controllers/claims.controller";
export * as documentsApi from "./controllers/documents.controller";
export * as blockchainApi from "./controllers/blockchain.controller";
export * as healthApi from "./controllers/health.controller";
