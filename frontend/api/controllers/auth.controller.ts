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
}

/** Policyholder sign-in with email and password. */
export const loginPolicyholder = (email: string, password: string) =>
  run("auth.loginPolicyholder", () =>
    send<LoginResponse>(authRoutes.policyholderLogin, { body: { email, password } })
  );

/** Policyholder self-registration. */
export const registerPolicyholder = (email: string, password: string, fullName: string) =>
  run("auth.registerPolicyholder", () =>
    send<{ user: User }>(authRoutes.policyholderRegister, { body: { email, password, fullName } })
  );

/** Staff sign-in: the connected MetaMask address identifies them. */
export const loginStaff = (walletAddress: string) =>
  run("auth.loginStaff", () => send<LoginResponse>(authRoutes.staffLogin, { body: { walletAddress } }));

/** Admin: add a staff member (verifier, admin or auditor). */
export const registerStaff = (
  wallet: string,
  form: { walletAddress: string; fullName: string; email: string; role: UserRole }
) => run("auth.registerStaff", () => send<{ user: User }>(authRoutes.staffRegister, { auth: { wallet }, body: form }));

/** Admin: list every user. */
export const listUsers = (wallet: string) =>
  run("auth.listUsers", () => send<{ users: User[] }>(authRoutes.listUsers, { auth: { wallet } }));

/** Admin: change a user's role or switch the account on or off. */
export const updateUser = (wallet: string, id: string, changes: { role?: UserRole; isActive?: boolean }) =>
  run("auth.updateUser", () => send<{ user: User }>(authRoutes.updateUser(id), { auth: { wallet }, body: changes }));
