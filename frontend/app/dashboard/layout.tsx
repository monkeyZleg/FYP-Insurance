"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useRole } from "@/hooks/useRole";

const noop = () => () => {};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role } = useRole();
  // The role lives in localStorage, which reads as empty during hydration.
  // Only redirect once the client snapshot is in, or a hard refresh on any
  // dashboard page bounces a signed-in user back to /login.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    if (hydrated && !role) router.replace("/login");
  }, [hydrated, role, router]);

  if (!role) return null;

  return <AppShell role={role}>{children}</AppShell>;
}
