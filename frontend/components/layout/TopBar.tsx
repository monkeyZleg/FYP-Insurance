"use client";
import Link from "next/link";
import WalletConnect from "@/components/shared/WalletConnect";
import RoleBadge from "@/components/shared/RoleBadge";
import NetworkIndicator from "@/components/blockchain/NetworkIndicator";
import { useRole } from "@/hooks/useRole";

export default function TopBar({ title }: { title: string }) {
  const { role, userName, logout } = useRole();

  return (
    <header className="bg-white border-b border-border px-6 md:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-ink font-display">{title}</h1>
        <RoleBadge role={role} />
      </div>
      <div className="flex items-center gap-3">
        {role !== "policyholder" && <NetworkIndicator />}
        {userName && (
          <span className="hidden sm:inline text-sm text-gray-500">{userName}</span>
        )}
        {role !== "policyholder" && <WalletConnect />}
        <Link
          href="/login"
          title="Demo convenience — not part of the real product"
          className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
        >
          Switch demo account
        </Link>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
