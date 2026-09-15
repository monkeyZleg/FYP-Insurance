"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMetaMask } from "@/hooks/useMetaMask";
import { apiFetch } from "@/lib/api";
import WalletConnect from "@/components/WalletConnect";

export default function LoginPage() {
  const { address } = useMetaMask();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      </div>
    </main>
  );
}
