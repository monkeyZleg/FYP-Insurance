"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightRegular, CheckmarkCircleFilled, EyeOffRegular, EyeRegular } from "@fluentui/react-icons";
import { apiFetchAuth } from "@/lib/api";
import Mascot from "@/components/mascot/Mascot";
import AuthLayout from "@/components/landing/AuthLayout";
import InfoBar from "@/components/ui/InfoBar";
import Spinner from "@/components/ui/Spinner";

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH = [
  { label: "Too short", color: "var(--critical)" },
  { label: "Weak", color: "var(--critical)" },
  { label: "Fair", color: "var(--caution-solid)" },
  { label: "Good", color: "var(--success)" },
  { label: "Strong", color: "var(--success)" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetchAuth("/api/auth/policyholder/register", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const pw = strength(password);

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px]">
        {done ? (
          <div className="pop-in text-center">
            <Mascot mood="happy" className="mx-auto mb-5 h-20 w-20" />
            <h1 className="t-title text-fg">You&apos;re all set</h1>
            <p className="mt-2 t-body text-fg-2">Account created. You can now log in.</p>
            <button onClick={() => router.push("/login")} className="btn btn-accent btn-lg btn-block nudge mt-8">
              Go to login <ArrowRightRegular />
            </button>
          </div>
        ) : (
          <>
            <div className="enter">
              <Mascot mood="neutral" className="mb-5 h-14 w-14" />
              <h1 className="t-title text-fg">Create your account</h1>
              <p className="mt-1 t-body text-fg-2">Register as a policyholder with your email and password.</p>
            </div>
            <form onSubmit={handleSubmit} className="enter enter-2 mt-8 space-y-5">
              <div>
                <label htmlFor="fullName" className="field-label">
                  Full name
                </label>
                <input
                  id="fullName"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="textbox"
                  placeholder="Jane Doe"
                />
              </div>
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
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="textbox pr-10"
                    placeholder="At least 8 characters"
                    aria-describedby="pw-strength"
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
                <div id="pw-strength" className="mt-2 flex items-center gap-3" aria-live="polite">
                  <div className="grid flex-1 grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="h-1 rounded-full transition-colors duration-300"
                        style={{ background: password && i < pw ? STRENGTH[pw].color : "var(--control-stroke-secondary)" }}
                      />
                    ))}
                  </div>
                  <span className="w-16 text-right t-caption text-fg-2">{password ? STRENGTH[pw].label : ""}</span>
                </div>
              </div>
              {error && <InfoBar severity="error" title="Couldn't create account.">{error}</InfoBar>}
              <button type="submit" disabled={loading} className="btn btn-accent btn-lg btn-block">
                {loading ? (
                  <>
                    <Spinner /> Creating account…
                  </>
                ) : (
                  <>
                    <CheckmarkCircleFilled /> Create account
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-center t-body text-fg-2">
          Already have an account?{" "}
          <Link href="/login" className="link font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
