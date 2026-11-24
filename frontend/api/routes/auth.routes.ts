import type { Route } from "../client";

export const authRoutes = {
  login: { method: "POST", path: "/api/auth/login" } as Route,
  staffRegister: { method: "POST", path: "/api/auth/register" } as Route,
  policyholderRegister: { method: "POST", path: "/api/auth/policyholder/register" } as Route,
  listUsers: { method: "GET", path: "/api/auth/users" } as Route,
  updateUser: (id: string): Route => ({ method: "PATCH", path: `/api/auth/users/${id}` }),
};
