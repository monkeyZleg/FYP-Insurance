"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMetaMask } from "@/hooks/useMetaMask";
import { apiFetch } from "@/lib/api";
import WalletConnect from "@/components/shared/WalletConnect";
import type { UserRole } from "@/types";

const DEMO_ROLES: { role: UserRole; label: string; icon: string }[] = [
  { role: "policyholder", label: "Policyholder", icon: "🧑‍💼" },
  { role: "verifier", label: "Claim Verifier", icon: "🔎" },
  { role: "admin", label: "Insurance Admin", icon: "🗂️" },
  { role: "auditor", label: "Auditor", icon: "🧾" },
];

export default function LoginPage() {
  const { address } = useMetaMask();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function previewAs(role: UserRole) {
    localStorage.removeItem("jwt");
    localStorage.setItem("role", role);
    localStorage.setItem("wallet", address || "0x0000000000000000000000000000000000demo");
    localStorage.setItem("userName", `Demo ${role}`);
    localStorage.setItem("userId", "");
    router.push(`/dashboard/${role}`);
  }

  async function handleLogin() {
    if (!address) {
      setError("Please connect your wallet first.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ walletAddress: address }),
      });

      localStorage.setItem("jwt", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("wallet", address);
      localStorage.setItem("userName", data.name || "");
      localStorage.setItem("userId", data.userId || "");

      router.push(`/dashboard/${data.role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">BEICVS Login</h1>
        <p className="text-gray-500 text-center text-sm mb-8">
          Connect your MetaMask wallet to authenticate
        </p>

        <div className="flex justify-center mb-6">
          <WalletConnect />
        </div>

        {address && (
          <div className="space-y-4">
            <p className="text-sm text-center text-gray-600">
              Connected as:{" "}
              <span className="font-mono font-medium">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </p>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Logging in..." : "Login with Wallet"}
            </button>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm text-center mt-4">{error}</p>
        )}

        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-gray-400 text-center mb-3">
            No registered wallet yet? Preview a dashboard (demo data only)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() => previewAs(r.role)}
                className="flex items-center gap-2 justify-center text-sm border rounded-lg py-2 px-3 hover:bg-gray-50 text-gray-600"
              >
                <span>{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
