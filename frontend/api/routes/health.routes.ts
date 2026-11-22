import type { Route } from "../client";

export const healthRoutes = {
  check: { method: "GET", path: "/api/health" } as Route,
};
