import type { Route } from "../client";

export const documentRoutes = {
  byClaim: (claimId: string): Route => ({ method: "GET", path: `/api/documents/${claimId}` }),
};
