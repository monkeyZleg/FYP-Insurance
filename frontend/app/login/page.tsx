"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  ArrowRightRegular,
  ClipboardTaskListLtrRegular,
  EyeOffRegular,
  EyeRegular,
  PeopleRegular,
  PersonRegular,
  ReceiptSearchRegular,
  ShieldKeyholeRegular,
  WalletRegular,
} from "@fluentui/react-icons";
import { useMetaMask } from "@/hooks/useMetaMask";
import { apiFetch } from "@/lib/api";
import Mascot from "@/components/mascot/Mascot";
import AuthLayout from "@/components/landing/AuthLayout";
import SelectorBar from "@/components/ui/SelectorBar";
import InfoBar from "@/components/ui/InfoBar";
import Spinner from "@/components/ui/Spinner";
import type { UserRole } from "@/types";

const DEMO_STAFF_ROLES: { role: UserRole; label: string; Icon: typeof PeopleRegular }[] = [
  { role: "verifier", label: "Verifier", Icon: ClipboardTaskListLtrRegular },
  { role: "admin", label: "Admin", Icon: PeopleRegular },
  { role: "auditor", label: "Auditor", Icon: ReceiptSearchRegular },
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
  const [showPassword, setShowPassword] = useState(false);
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
    const dir = target === "staff" ? 1 : -1;
    gsap.to(panel, {
      opacity: 0,
      x: -12 * dir,
      duration: 0.12,
      ease: "power1.in",
      onComplete: () => {
        setTab(target);
        gsap.fromTo(panel, { opacity: 0, x: 16 * dir }, { opacity: 1, x: 0, duration: 0.35, ease: "expo.out" });
      },
    });
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
    staffPhase === "connecting" ? "Connecting…" : staffPhase === "checking" ? "Checking wallet…" : "Connect MetaMask";

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px]">
        <div className="enter">
          <Mascot mood="neutral" className="mb-5 h-14 w-14" />
          <h1 className="t-title text-fg">Welcome back</h1>
          <p className="mt-1 t-body text-fg-2">Sign in as a policyholder, or as staff with your wallet.</p>
        </div>

        <div className="enter enter-2 mt-6 border-b border-[var(--divider-stroke)]">
          <SelectorBar
            label="Sign-in method"
            value={tab}
            onChange={switchTab}
            items={[
              { value: "policyholder", label: "Policyholder", icon: PersonRegular },
              { value: "staff", label: "Staff", icon: ShieldKeyholeRegular },
            ]}
          />
        </div>

        <div ref={panelRef} className="enter enter-3 pt-6" role="tabpanel">
          {tab === "policyholder" && (
            <form onSubmit={handlePolicyholderLogin} className="space-y-5" noValidate={false}>
              <div>
                <label htmlFor="email" className="field-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="textbox"
                  placeholder="you@example.com"
                  aria-invalid={phError ? true : undefined}
                />
              </div>
              <div>
                <label htmlFor="password" className="field-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="textbox pr-10"
                    placeholder="Enter your password"
                    aria-invalid={phError ? true : undefined}
                  />
                  {password && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="btn btn-subtle btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOffRegular /> : <EyeRegular />}
                    </button>
                  )}
                </div>
              </div>
              {phError && <InfoBar severity="error" title="Couldn't sign in.">{phError}</InfoBar>}
              <button type="submit" disabled={phLoading} className="btn btn-accent btn-lg btn-block nudge">
                {phLoading ? (
                  <>
                    <Spinner /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in <ArrowRightRegular />
                  </>
                )}
              </button>
              <p className="pt-1 text-center t-body text-fg-2">
                New here?{" "}
                <Link href="/register" className="link font-semibold">
                  Create an account
                </Link>
              </p>
            </form>
          )}

          {tab === "staff" && (
            <div>
              <div className="card flex items-start gap-4 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-[linear-gradient(145deg,#ffb35c,#f6851b_55%,#c75a12)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                  <WalletRegular fontSize={22} aria-hidden />
                </span>
                <p className="t-body text-fg-2">
                  Connecting your wallet is how staff sign in — <span className="text-fg font-semibold">no password needed.</span> Your
                  wallet address is matched to your staff role.
                </p>
              </div>
              <button
                type="button"
                onClick={handleConnectMetaMask}
                disabled={staffPhase !== "idle"}
                className="btn btn-accent btn-lg btn-block mt-5"
              >
                {staffPhase !== "idle" ? <Spinner /> : <WalletRegular />}
                {staffButtonLabel}
              </button>

              {address && staffPhase === "idle" && (
                <p className="mt-3 text-center t-body text-fg-2">
                  Connected as <span className="hash-chip">{address.slice(0, 6)}…{address.slice(-4)}</span>
                </p>
              )}

              {staffError && (
                <InfoBar severity="error" className="mt-4">
                  {staffError}
                </InfoBar>
              )}

              <div className="mt-8">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-[var(--divider-stroke)]" />
                  <span className="t-caption text-fg-3">Demo preview</span>
                  <span className="h-px flex-1 bg-[var(--divider-stroke)]" />
                </div>
                <p className="mt-3 text-center t-caption text-fg-3">
                  Demo convenience only — not part of the real product. Preview a staff dashboard without a registered
                  wallet:
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {DEMO_STAFF_ROLES.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("jwt");
                        localStorage.removeItem("holderId");
                        localStorage.setItem("role", r.role);
                        localStorage.setItem("wallet", address || "0x0000000000000000000000000000000000demo");
                        localStorage.setItem("userName", `Demo ${r.role}`);
                        localStorage.setItem("userId", "");
                        router.push(`/dashboard/${r.role}`);
                      }}
                      className="card card-interactive reveal flex flex-col items-center gap-2 px-2 py-3 t-caption text-fg"
                    >
                      <r.Icon fontSize={20} className="text-fg-2" aria-hidden />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
