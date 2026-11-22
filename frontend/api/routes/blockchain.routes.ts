import type { Route } from "../client";

export const blockchainRoutes = {
  audit: (claimId: string): Route => ({ method: "GET", path: `/api/blockchain/audit/${claimId}` }),
  verify: (claimId: string): Route => ({ method: "GET", path: `/api/blockchain/verify/${claimId}` }),
  claim: (claimId: string): Route => ({ method: "GET", path: `/api/blockchain/claim/${claimId}` }),
};
