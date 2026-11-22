import type { Route } from "../client";

export const policyRoutes = {
  plans: { method: "GET", path: "/api/policies/plans" } as Route,
  mine: { method: "GET", path: "/api/policies/my" } as Route,
  create: { method: "POST", path: "/api/policies" } as Route,
  pay: (id: string): Route => ({ method: "POST", path: `/api/policies/${id}/pay` }),
  renew: (id: string): Route => ({ method: "POST", path: `/api/policies/${id}/renew` }),
  payments: (id: string): Route => ({ method: "GET", path: `/api/policies/${id}/payments` }),
  eligibility: (id: string): Route => ({ method: "GET", path: `/api/policies/${id}/eligibility` }),
};
