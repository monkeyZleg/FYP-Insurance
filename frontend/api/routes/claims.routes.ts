import type { Route } from "../client";

export const claimRoutes = {
  create: { method: "POST", path: "/api/claims" } as Route,
  mine: { method: "GET", path: "/api/claims/my" } as Route,
  pending: { method: "GET", path: "/api/claims/pending" } as Route,
  all: { method: "GET", path: "/api/claims/all" } as Route,
  byId: (id: string): Route => ({ method: "GET", path: `/api/claims/${id}` }),
  saveRemark: (id: string): Route => ({ method: "PATCH", path: `/api/claims/${id}/remark` }),
};
