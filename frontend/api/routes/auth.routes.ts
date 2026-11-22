import type { Route } from "../client";

export const authRoutes = {
  staffLogin: { method: "POST", path: "/api/auth/login" } as Route,
  staffRegister: { method: "POST", path: "/api/auth/register" } as Route,
  policyholderRegister: { method: "POST", path: "/api/auth/policyholder/register" } as Route,
  policyholderLogin: { method: "POST", path: "/api/auth/policyholder/login" } as Route,
  listUsers: { method: "GET", path: "/api/auth/users" } as Route,
  updateUser: (id: string): Route => ({ method: "PATCH", path: `/api/auth/users/${id}` }),
};
