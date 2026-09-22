"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useRole } from "@/hooks/useRole";
import type { UserRole } from "@/types";

const TITLES: Record<UserRole, string> = {
  policyholder: "BEICVS — Policyholder",
  verifier: "BEICVS — Claim Verifier",
  admin: "BEICVS — Insurance Admin",
  auditor: "BEICVS — Auditor",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role } = useRole();

  useEffect(() => {
    if (!role) router.replace("/login");
  }, [role, router]);

  if (!role) return null;

  return (
    <div className="flex min-h-screen bg-cloud">
      <Sidebar role={role} />
      <div className="flex-1 min-w-0">
        <TopBar title={TITLES[role]} />
        <main className="px-6 md:px-8 py-8 max-w-[1200px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
