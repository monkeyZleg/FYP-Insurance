import { send } from "../client";
import { run } from "../run";
import { blockchainRoutes } from "../routes/blockchain.routes";
import type { AuditEvent } from "@/types";

/** Full on-chain history of a claim. Pass a token (policyholder) or a wallet (staff). */
export const auditTrail = (auth: { token: string } | { wallet: string }, claimId: string) =>
  run("blockchain.auditTrail", () => send<AuditEvent[]>(blockchainRoutes.audit(claimId), { auth }));
