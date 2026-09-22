"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMetaMask } from "@/hooks/useMetaMask";
import { apiFetch, apiFetchAuth } from "@/lib/api";
import WalletConnect from "@/components/shared/WalletConnect";
import Mascot from "@/components/mascot/Mascot";
import type { UserRole } from "@/types";

const DEMO_STAFF_ROLES: { role: UserRole; label: string; icon: string }[] = [
  { role: "verifier", label: "Claim Verifier", icon: "🔎" },
  { role: "admin", label: "Insurance Admin", icon: "🗂️" },
  { role: "auditor", label: "Auditor", icon: "🧾" },
];

export default function LoginPage() {
  const { address } = useMetaMask();
  const router = useRouter();
  const [tab, setTab] = useState<"policyholder" | "staff">("policyholder");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phError, setPhError] = useState("");
  const [phLoading, setPhLoading] = useState(false);

  const [staffError, setStaffError] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);

  function previewAsStaff(role: UserRole) {
    localStorage.removeItem("jwt");
    localStorage.removeItem("holderId");
    localStorage.setItem("role", role);
    localStorage.setItem("wallet", address || "0x0000000000000000000000000000000000demo");
    localStorage.setItem("userName", `Demo ${role}`);
    localStorage.setItem("userId", "");
    router.push(`/dashboard/${role}`);
  }

  async function handlePolicyholderLogin(e: React.FormEvent) {
    e.preventDefault();

    setPhLoading(true);
    setPhError("");

    try {
      // Hardcoded login credentials
      if (email !== "lsk@gmail.com" || password !== "123456") {
        throw new Error("Invalid email or password");
      } else {
        // Redirect to dashboard
        router.push("/dashboard/policyholder");

      }

      // Mock login data
      const data = {
        token: "mock-jwt-token",
        role: "policyholder",
        name: "Leong Seng Khuan",
        userId: "1",
        holderId: "1",
      };

      // Store login information
      localStorage.setItem("jwt", data.token);
      localStorage.setItem("role", data.role);
      localStorage.removeItem("wallet");
      localStorage.setItem("userName", data.name || "");
      localStorage.setItem("userId", data.userId || "");
      localStorage.setItem("holderId", data.holderId || "");

      // Redirect to dashboard
      router.push("/dashboard/policyholder");

    } catch (err) {
      setPhError(
        err instanceof Error ? err.message : "Login failed"
      );
    } finally {
      setPhLoading(false);
    }
  }

  async function handleStaffLogin() {
    if (!address) {
      setStaffError("Please connect your wallet first.");
      return;
    }
    setStaffLoading(true);
    setStaffError("");

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
      localStorage.removeItem("holderId");

      router.push(`/dashboard/${data.role}`);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setStaffLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cloud to-[#EEF0FC] px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <Mascot mood="neutral" className="w-14 h-14 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-center mb-2 text-ink">Welcome back</h1>
        <p className="text-gray-500 text-center text-sm mb-6">
          Sign in as a policyholder, or as staff with your wallet
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6 bg-cloud rounded-lg p-1">
          <button
            onClick={() => setTab("policyholder")}
            className={`text-sm font-medium py-2 rounded-md transition-colors ${tab === "policyholder" ? "bg-white shadow text-chain-indigo" : "text-gray-500"
              }`}
          >
            🧑‍💼 Policyholder
          </button>
          <button
            onClick={() => setTab("staff")}
            className={`text-sm font-medium py-2 rounded-md transition-colors ${tab === "staff" ? "bg-white shadow text-chain-indigo" : "text-gray-500"
              }`}
          >
            🗂️ Staff
          </button>
        </div>

        {tab === "policyholder" && (
          <div>
            <form onSubmit={handlePolicyholderLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 font-medium">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2"
                  placeholder="••••••••"
                />
              </div>
              {phError && <p className="text-failure text-sm">{phError}</p>}
              <button
                type="submit"
                disabled={phLoading}
                className="w-full bg-chain-indigo text-white py-3 rounded-lg font-medium hover:bg-[#2F3FC0] disabled:opacity-50 transition-colors"
              >
                {phLoading ? "Logging in..." : "Login"}
              </button>
            </form>
            <p className="text-sm text-center text-gray-500 mt-4">
              New here?{" "}
              <Link href="/register" className="text-chain-indigo hover:underline font-medium">
                Create an account
              </Link>
            </p>
          </div>
        )}

        {tab === "staff" && (
          <div>
            <p className="text-gray-500 text-center text-sm mb-6">
              Connect your MetaMask wallet to authenticate as a verifier, admin or auditor
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
                  onClick={handleStaffLogin}
                  disabled={staffLoading}
                  className="w-full bg-chain-indigo text-white py-3 rounded-lg font-medium hover:bg-[#2F3FC0] disabled:opacity-50 transition-colors"
                >
                  {staffLoading ? "Logging in..." : "Login with Wallet"}
                </button>
              </div>
            )}

            {staffError && <p className="text-failure text-sm text-center mt-4">{staffError}</p>}

            <div className="mt-8 pt-6 border-t">
              <p className="text-xs text-gray-400 text-center mb-3">
                No registered wallet yet? Preview a staff dashboard (demo data only)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_STAFF_ROLES.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => previewAsStaff(r.role)}
                    className="flex items-center gap-2 justify-center text-sm border border-border rounded-lg py-2 px-3 hover:bg-cloud text-gray-600 transition-colors"
                  >
                    <span>{r.icon}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
