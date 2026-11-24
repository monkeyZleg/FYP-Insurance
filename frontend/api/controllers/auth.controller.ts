import { send } from "../client";
import { run } from "../run";
import { authRoutes } from "../routes/auth.routes";
import type { User, UserRole } from "@/types";

export interface LoginResponse {
  token: string;
  role: UserRole;
  name: string;
  userId: string;
  holderId?: string;
  /** Staff only: the registered wallet that signs their on-chain actions. */
  walletAddress?: string;
}

/** Sign in with email and password as the chosen role (every role). */
export const login = (email: string, password: string, role: UserRole) =>
  run("auth.login", () => send<LoginResponse>(authRoutes.login, { body: { email, password, role } }));

/** Policyholder self-registration. */
export const registerPolicyholder = (email: string, password: string, fullName: string) =>
  run("auth.registerPolicyholder", () =>
    send<{ user: User }>(authRoutes.policyholderRegister, { body: { email, password, fullName } })
  );

/** Admin: add a staff member (verifier, admin or auditor). */
export const registerStaff = (
  token: string,
  form: { walletAddress: string; fullName: string; email: string; password: string; role: UserRole }
) => run("auth.registerStaff", () => send<{ user: User }>(authRoutes.staffRegister, { auth: { token }, body: form }));

/** Admin: list every user. */
export const listUsers = (token: string) =>
  run("auth.listUsers", () => send<{ users: User[] }>(authRoutes.listUsers, { auth: { token } }));

/** Admin: change a user's role or switch the account on or off. */
export const updateUser = (token: string, id: string, changes: { role?: UserRole; isActive?: boolean }) =>
  run("auth.updateUser", () => send<{ user: User }>(authRoutes.updateUser(id), { auth: { token }, body: changes }));
