"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import type { User, UserRole } from "@/types";
import { PeopleRegular, PersonAddRegular } from "@fluentui/react-icons";
import PageHeader from "@/components/ui/PageHeader";
import SelectorBar from "@/components/ui/SelectorBar";
import Select from "@/components/ui/Select";
import Dialog from "@/components/ui/Dialog";
import InfoBar from "@/components/ui/InfoBar";
import Spinner from "@/components/ui/Spinner";
import Persona from "@/components/ui/Persona";
import EmptyState from "@/components/ui/EmptyState";
import ToneBadge from "@/components/ui/ToneBadge";
import { ROLE_LABELS } from "@/components/shared/RoleBadge";

const ROLES: UserRole[] = ["policyholder", "verifier", "admin", "auditor"];
const STAFF_ROLES: UserRole[] = ["verifier", "admin", "auditor"];

export default function UserManagementPage() {
  const { wallet } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | "All">("All");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ walletAddress: "", fullName: "", email: "", role: "verifier" as UserRole });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (wallet) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  async function loadUsers() {
    try {
      const data = await apiFetch("/api/auth/users", {}, wallet);
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
  }

  const filtered = useMemo(
    () => (roleFilter === "All" ? users : users.filter((u) => u.role === roleFilter)),
    [users, roleFilter]
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(form) }, wallet);
      setShowAdd(false);
      setForm({ walletAddress: "", fullName: "", email: "", role: "verifier" });
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(user: User, role: UserRole) {
    await apiFetch(`/api/auth/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ role }) }, wallet);
    loadUsers();
  }

  async function toggleActive(user: User) {
    await apiFetch(
      `/api/auth/users/${user.id}`,
      { method: "PATCH", body: JSON.stringify({ isActive: user.is_active === false }) },
      wallet
    );
    loadUsers();
  }

  const counts: Record<string, number> = { All: users.length };
  users.forEach((u) => (counts[u.role] = (counts[u.role] || 0) + 1));

  return (
    <div>
      <PageHeader
        title="User management"
        description="Staff sign in with a registered wallet. Policyholders register themselves."
        actions={
          <button onClick={() => setShowAdd(true)} className="btn btn-accent">
            <PersonAddRegular /> Add user
          </button>
        }
      />

      <div className="card enter enter-2 overflow-hidden">
        <div className="border-b border-[var(--divider-stroke)] px-3 pt-2">
          <SelectorBar
            label="Filter by role"
            value={roleFilter}
            onChange={setRoleFilter}
            items={[
              { value: "All" as const, label: "All", count: counts.All },
              ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r], count: counts[r] || 0 })),
            ]}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState compact icon={PeopleRegular} title="No users found" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th className="hidden md:table-cell">Wallet</th>
                  <th>Role</th>
                  <th className="hidden sm:table-cell">Registered</th>
                  <th>Status</th>
                  <th className="w-px" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="stagger">
                {filtered.map((u) => {
                  const inactive = u.is_active === false;
                  return (
                    <tr key={u.id} className={inactive ? "opacity-70" : ""}>
                      <td>
                        <span className="flex items-center gap-3">
                          <Persona name={u.full_name || u.email || "?"} size={32} />
                          <span className="min-w-0">
                            <span className="block t-body-strong text-fg truncate">{u.full_name || "—"}</span>
                            <span className="block t-caption text-fg-2 truncate">{u.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="hidden font-mono text-[12.5px] text-fg-2 md:table-cell">
                        {u.wallet_address ? `${u.wallet_address.slice(0, 8)}…${u.wallet_address.slice(-6)}` : <span className="font-sans text-fg-3">Email login</span>}
                      </td>
                      <td>
                        <Select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value as UserRole)}
                          aria-label={`Role for ${u.full_name}`}
                          wrapClassName="w-[150px]"
                          className="!min-h-7 !py-1 t-caption"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="hidden whitespace-nowrap text-fg-2 tabular-nums sm:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <ToneBadge tone={inactive ? "neutral" : "success"} dot>
                          {inactive ? "Deactivated" : "Active"}
                        </ToneBadge>
                      </td>
                      <td className="text-right">
                        <button onClick={() => toggleActive(u)} className={`btn btn-sm btn-subtle ${inactive ? "text-accent-text" : "text-[var(--critical)]"}`}>
                          {inactive ? "Reactivate" : "Deactivate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <Dialog
          title="Add a staff member"
          as="form"
          onSubmit={handleAdd}
          onClose={() => setShowAdd(false)}
          dismissible={!saving}
          footer={
            <>
              <button type="submit" disabled={saving} className="btn btn-accent">
                {saving && <Spinner />}
                {saving ? "Adding…" : "Add user"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} disabled={saving} className="btn">
                Cancel
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="field-label" htmlFor="nu-wallet">
                Wallet address
              </label>
              <input
                id="nu-wallet"
                required
                value={form.walletAddress}
                onChange={(e) => setForm((f) => ({ ...f, walletAddress: e.target.value }))}
                placeholder="0x…"
                className="textbox textbox-mono"
                pattern="^0x[a-fA-F0-9]{40}$"
                title="A 42-character Ethereum address starting with 0x"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="nu-name">
                Full name
              </label>
              <input
                id="nu-name"
                required
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="textbox"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="nu-email">
                Email <span className="t-caption text-fg-3">(optional)</span>
              </label>
              <input
                id="nu-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="textbox"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="nu-role">
                Role
              </label>
              <Select id="nu-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <p className="field-hint">Policyholders register themselves with email + password from the login page.</p>
            </div>
            {error && <InfoBar severity="error">{error}</InfoBar>}
          </div>
        </Dialog>
      )}
    </div>
  );
}
