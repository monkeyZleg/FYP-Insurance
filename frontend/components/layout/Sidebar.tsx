"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";

const NAV: Record<UserRole, { label: string; href: string; icon: string }[]> = {
  policyholder: [
    { label: "Overview", href: "/dashboard/policyholder", icon: "🏠" },
    { label: "My Policies", href: "/dashboard/policyholder/policies", icon: "🗒️" },
    { label: "Buy a Policy", href: "/dashboard/policyholder/policies/plans", icon: "🛒" },
    { label: "My Claims", href: "/dashboard/policyholder/claims", icon: "📋" },
    { label: "New Claim", href: "/dashboard/policyholder/claims/new", icon: "➕" },
    { label: "My Documents", href: "/dashboard/policyholder/documents", icon: "📄" },
  ],
  verifier: [
    { label: "Claims Queue", href: "/dashboard/verifier", icon: "🔎" },
  ],
  admin: [
    { label: "Overview", href: "/dashboard/admin", icon: "🏠" },
    { label: "Users", href: "/dashboard/admin/users", icon: "👥" },
    { label: "Assign Claims", href: "/dashboard/admin/assign", icon: "🗂️" },
  ],
  auditor: [
    { label: "Audit Trail", href: "/dashboard/auditor", icon: "🧾" },
    { label: "Hash Checker", href: "/dashboard/auditor/verify", icon: "🔐" },
  ],
};

export default function Sidebar({ role }: { role: UserRole | null }) {
  const pathname = usePathname();
  const items = role ? NAV[role] : [];

  return (
    <aside className="hidden md:flex md:flex-col w-56 shrink-0 bg-white border-r border-border min-h-screen px-3 py-6">
      <Link href="/" className="px-3 mb-8 text-lg font-bold text-ink font-display">
        BEICVS
      </Link>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#EEF0FC] text-chain-indigo"
                  : "text-gray-600 hover:bg-cloud"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
