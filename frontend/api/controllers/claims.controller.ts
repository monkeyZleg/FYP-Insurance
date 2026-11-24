import { send } from "../client";
import { run } from "../run";
import { claimRoutes } from "../routes/claims.routes";
import type { Claim, Document as ClaimDocument } from "@/types";

/** Policyholder: submit a claim. `form` carries the fields and the files (multipart). */
export const createClaim = (token: string, form: FormData) =>
  run("claims.createClaim", () =>
    send<{ claim: Claim; documents: ClaimDocument[]; txHash: string }>(claimRoutes.create, {
      auth: { token },
      body: form,
    })
  );

/** Policyholder: their own claims. */
export const myClaims = (token: string) =>
  run("claims.myClaims", () => send<{ claims: Claim[] }>(claimRoutes.mine, { auth: { token } }));

/** Admin: claims still waiting for a verifier. */
export const pendingClaims = (token: string) =>
  run("claims.pendingClaims", () => send<{ claims: Claim[] }>(claimRoutes.pending, { auth: { token } }));

/** Admin, verifier or auditor: every claim. */
export const allClaims = (token: string) =>
  run("claims.allClaims", () => send<{ claims: Claim[] }>(claimRoutes.all, { auth: { token } }));

/** One claim, joined with its on-chain record. */
export const getClaim = (auth: { token: string }, claimId: string) =>
  run("claims.getClaim", () => send<{ claim: Claim }>(claimRoutes.byId(claimId), { auth }));

/** Verifier: save the written remark after deciding on-chain (accepted only if it matches the on-chain hash). */
export const saveRemark = (token: string, claimId: string, remark: string) =>
  run("claims.saveRemark", () =>
    send<{ claim: { id: string; verifier_remark: string } }>(claimRoutes.saveRemark(claimId), {
      auth: { token },
      body: { remark },
    })
  );
