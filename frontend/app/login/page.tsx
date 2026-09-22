"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useMetaMask } from "@/hooks/useMetaMask";
import { apiFetch, apiFetchAuth } from "@/lib/api";
import Mascot from "@/components/mascot/Mascot";
import type { UserRole } from "@/types";

const DEMO_STAFF_ROLES: { role: UserRole; label: string; icon: string }[] = [
  { role: "verifier", label: "Claim Verifier", icon: "🔎" },
  { role: "admin", label: "Insurance Admin", icon: "🗂️" },
  { role: "auditor", label: "Auditor", icon: "🧾" },
];

const UNREGISTERED_STAFF_MESSAGE = "This wallet isn't registered for staff access. Contact your administrator.";

export default function LoginPage() {
  const { address, connect } = useMetaMask();
  const router = useRouter();
  const [tab, setTab] = useState<"policyholder" | "staff">("policyholder");
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingAutoLogin = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phError, setPhError] = useState("");
  const [phLoading, setPhLoading] = useState(false);

  const [staffPhase, setStaffPhase] = useState<"idle" | "connecting" | "checking">("idle");
  const [staffError, setStaffError] = useState("");

  // Login role-tab crossfade (design spec landing-login-spec.md Part 7) — reuses
  // the same easing family as the mascot bob, no new animation vocabulary.
  function switchTab(target: "policyholder" | "staff") {
    if (target === tab || !panelRef.current) {
      setTab(target);
      return;
    }
    const panel = panelRef.current;
    gsap.to(panel, {
      opacity: 0,
      y: 6,
      duration: 0.15,
      onComplete: () => {
        setTab(target);
        gsap.fromTo(panel, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.2 });
      },
    });
  }

  async function handlePolicyholderLogin(e: React.FormEvent) {
    e.preventDefault();
    setPhLoading(true);
    setPhError("");
    try {
      const data = await apiFetchAuth("/api/auth/policyholder/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("jwt", data.token);
      localStorage.setItem("role", data.role);
      localStorage.removeItem("wallet");
      localStorage.setItem("userName", data.name || "");
      localStorage.setItem("userId", data.userId || "");
      localStorage.setItem("holderId", data.holderId || "");

      router.push("/dashboard/policyholder");
    } catch (err) {
      setPhError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPhLoading(false);
    }
  }

  async function handleConnectMetaMask() {
    setStaffError("");
    setStaffPhase("connecting");
    pendingAutoLogin.current = true;
    try {
      await connect();
    } catch (err) {
      pendingAutoLogin.current = false;
      setStaffPhase("idle");
      setStaffError(err instanceof Error ? err.message : "Could not connect to MetaMask.");
    }
  }

  // Wallet connection IS the authentication for staff (smart-contract-spec-hybrid.md
  // Section 1) — once MetaMask reports an address, look up its role immediately.
  useEffect(() => {
    if (!address || !pendingAutoLogin.current) return;
    pendingAutoLogin.current = false;
    setStaffPhase("checking");

    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ walletAddress: address }) }, undefined)
      .then((data) => {
        localStorage.setItem("jwt", data.token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("wallet", address);
        localStorage.setItem("userName", data.name || "");
        localStorage.setItem("userId", data.userId || "");
        localStorage.removeItem("holderId");
        router.push(`/dashboard/${data.role}`);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Login failed";
        setStaffError(message.toLowerCase().includes("not registered") ? UNREGISTERED_STAFF_MESSAGE : message);
        setStaffPhase("idle");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const staffButtonLabel =
    staffPhase === "connecting" ? "Connecting..." : staffPhase === "checking" ? "Checking wallet..." : "Connect MetaMask";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cloud to-[#EEF0FC] px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <Link href="/" className="block text-center text-sm font-bold text-chain-indigo font-display mb-4">
          BEICVS
        </Link>
        <Mascot mood="neutral" className="w-14 h-14 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-center mb-2 text-ink">Welcome back</h1>
        <p className="text-gray-500 text-center text-sm mb-6">
          Sign in as a policyholder, or as staff with your wallet
        </p>

        <div className="login-tabs grid grid-cols-2 gap-2 mb-6 bg-cloud rounded-lg p-1">
          <button
            onClick={() => switchTab("policyholder")}
            className={`text-sm font-medium py-2 rounded-md transition-colors ${
              tab === "policyholder" ? "bg-white shadow text-chain-indigo" : "text-gray-500"
            }`}
          >
            🧑‍💼 Policyholder
          </button>
          <button
            onClick={() => switchTab("staff")}
            className={`text-sm font-medium py-2 rounded-md transition-colors ${
              tab === "staff" ? "bg-white shadow text-chain-indigo" : "text-gray-500"
            }`}
          >
            🗂️ Staff
          </button>
        </div>

        <div ref={panelRef} className="login-tab-panel">
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
                  {phLoading ? "Logging in..." : "Log In"}
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
                Connecting your wallet is how staff sign in — no password needed.
              </p>
              <button
                onClick={handleConnectMetaMask}
                disabled={staffPhase !== "idle"}
                className="w-full bg-chain-indigo text-white py-3 rounded-lg font-medium hover:bg-[#2F3FC0] disabled:opacity-50 transition-colors"
              >
                {staffButtonLabel}
              </button>

              {address && staffPhase === "idle" && (
                <p className="text-sm text-center text-gray-500 mt-3">
                  Connected as{" "}
                  <span className="font-mono font-medium">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </p>
              )}

              {staffError && <p className="text-failure text-sm text-center mt-4">{staffError}</p>}

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-gray-400 text-center mb-3">
                  Demo convenience only — not part of the real product. Preview a staff dashboard without a
                  registered wallet:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_STAFF_ROLES.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        localStorage.removeItem("jwt");
                        localStorage.removeItem("holderId");
                        localStorage.setItem("role", r.role);
                        localStorage.setItem("wallet", address || "0x0000000000000000000000000000000000demo");
                        localStorage.setItem("userName", `Demo ${r.role}`);
                        localStorage.setItem("userId", "");
                        router.push(`/dashboard/${r.role}`);
                      }}
                      className="flex items-center gap-1 justify-center text-xs border border-border rounded-lg py-2 px-2 hover:bg-cloud text-gray-500 transition-colors"
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
      </div>
    </main>
  );
}
