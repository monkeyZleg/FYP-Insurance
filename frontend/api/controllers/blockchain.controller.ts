import { send } from "../client";
import { run } from "../run";
import { blockchainRoutes } from "../routes/blockchain.routes";
import type { AuditEvent } from "@/types";

/** Full on-chain history of a claim. */
export const auditTrail = (auth: { token: string }, claimId: string) =>
  run("blockchain.auditTrail", () => send<AuditEvent[]>(blockchainRoutes.audit(claimId), { auth }));
