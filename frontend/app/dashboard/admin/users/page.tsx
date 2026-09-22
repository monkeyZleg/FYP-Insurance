"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import type { User, UserRole } from "@/types";

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
    const data = await apiFetch("/api/auth/users", {}, wallet);
    setUsers(data.users || []);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-chain-indigo text-white px-4 py-2 rounded-lg text-sm hover:bg-[#2F3FC0]"
        >
          + Add New User
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setRoleFilter("All")}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
            roleFilter === "All" ? "bg-chain-indigo text-white" : "bg-white text-gray-600 hover:bg-cloud"
          }`}
        >
          All
        </button>
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium capitalize ${
              roleFilter === r ? "bg-chain-indigo text-white" : "bg-white text-gray-600 hover:bg-cloud"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-cloud text-left text-gray-500">
              <th className="px-4 py-3">Wallet Address</th>
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b hover:bg-cloud">
                <td className="px-4 py-3 font-mono text-xs">
                  {u.wallet_address ? `${u.wallet_address.slice(0, 8)}...${u.wallet_address.slice(-6)}` : "— (email login)"}
                </td>
                <td className="px-4 py-3">{u.full_name || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value as UserRole)}
                    className="border border-border rounded-lg px-2 py-1 text-xs capitalize"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      u.is_active === false ? "bg-gray-100 text-gray-500" : "bg-[#E6F7F2] text-[#0F8F70]"
                    }`}
                  >
                    {u.is_active === false ? "Deactivated" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)} className="text-xs text-chain-indigo hover:underline">
                    {u.is_active === false ? "Reactivate" : "Deactivate"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-12">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Add New User</h3>
            <div className="space-y-3">
              <input
                required
                value={form.walletAddress}
                onChange={(e) => setForm((f) => ({ ...f, walletAddress: e.target.value }))}
                placeholder="Wallet Address (0x...)"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono"
              />
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Full Name"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm capitalize"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                Policyholders register themselves with email + password from the login page.
              </p>
            </div>
            {error && <p className="text-sm text-failure mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-chain-indigo text-white py-2 rounded-lg font-medium hover:bg-[#2F3FC0] disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add User"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 border rounded-lg hover:bg-cloud"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
