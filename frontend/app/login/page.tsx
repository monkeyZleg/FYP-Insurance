"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightRegular,
  ClipboardTaskListLtrRegular,
  EyeOffRegular,
  EyeRegular,
  PeopleRegular,
  PersonRegular,
  ReceiptSearchRegular,
} from "@fluentui/react-icons";
import { authApi } from "@/api";
import Mascot from "@/components/mascot/Mascot";
import AuthLayout from "@/components/landing/AuthLayout";
import InfoBar from "@/components/ui/InfoBar";
import Spinner from "@/components/ui/Spinner";
import type { UserRole } from "@/types";

const ROLES: { role: UserRole; label: string; Icon: typeof PeopleRegular }[] = [
  { role: "policyholder", label: "Policyholder", Icon: PersonRegular },
  { role: "verifier", label: "Verifier", Icon: ClipboardTaskListLtrRegular },
  { role: "admin", label: "Admin", Icon: PeopleRegular },
  { role: "auditor", label: "Auditor", Icon: ReceiptSearchRegular },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("policyholder");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleLabel = ROLES.find((r) => r.role === role)!.label;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await authApi.login(email, password, role);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const data = result.data;
    localStorage.setItem("jwt", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("userName", data.name || "");
    localStorage.setItem("userId", data.userId || "");
    // Policyholders are a holder ID on-chain; staff keep the wallet that signs their actions.
    if (data.holderId) localStorage.setItem("holderId", data.holderId);
    else localStorage.removeItem("holderId");
    if (data.walletAddress) localStorage.setItem("wallet", data.walletAddress);
    else localStorage.removeItem("wallet");
    router.push(`/dashboard/${data.role}`);
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px]">
        <div className="enter">
          <Mascot mood="neutral" className="mb-5 h-14 w-14" />
          <h1 className="t-title text-fg">Welcome back</h1>
          <p className="mt-1 t-body text-fg-2">Choose your role, then sign in with your email and password.</p>
        </div>

        <fieldset className="enter enter-2 mt-6">
          <legend className="field-label">Sign in as</legend>
          <div role="radiogroup" aria-label="Sign in as" className="grid grid-cols-4 gap-2">
            {ROLES.map((r) => {
              const on = r.role === role;
              return (
                <button
                  key={r.role}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setRole(r.role);
                    setError("");
                  }}
                  className={`card flex flex-col items-center gap-1.5 px-1 py-3 t-caption transition-[box-shadow,color,background-color] duration-200 ${
                    on
                      ? "bg-[var(--accent-subtle)] font-semibold text-accent-text shadow-[0_0_0_2px_var(--accent-fill)]"
                      : "card-interactive text-fg-2 hover:text-fg"
                  }`}
                >
                  <r.Icon fontSize={20} aria-hidden />
                  {r.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <form onSubmit={handleLogin} noValidate className="enter enter-3 mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="textbox"
              placeholder="you@example.com"
              aria-invalid={error ? true : undefined}
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="textbox pr-10"
                placeholder="Enter your password"
                aria-invalid={error ? true : undefined}
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
          {error && <InfoBar severity="error" title="Couldn't sign in.">{error}</InfoBar>}
          <button type="submit" disabled={loading} className="btn btn-accent btn-lg btn-block nudge">
            {loading ? (
              <>
                <Spinner /> Signing in…
              </>
            ) : (
              <>
                Sign in as {roleLabel} <ArrowRightRegular />
              </>
            )}
          </button>
          <p className="pt-1 text-center t-body text-fg-2">
            {role === "policyholder" ? (
              <>
                New here?{" "}
                <Link href="/register" className="link font-semibold">
                  Create an account
                </Link>
              </>
            ) : (
              "Staff accounts are created by an admin."
            )}
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
