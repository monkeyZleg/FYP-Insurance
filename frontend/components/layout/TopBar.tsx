"use client";
import WalletConnect from "@/components/shared/WalletConnect";
import RoleBadge from "@/components/shared/RoleBadge";
import NetworkIndicator from "@/components/blockchain/NetworkIndicator";
import { useRole } from "@/hooks/useRole";

export default function TopBar({ title }: { title: string }) {
  const { role, userName, logout } = useRole();

  return (
    <header className="bg-white shadow-sm px-6 md:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-blue-900">{title}</h1>
        <RoleBadge role={role} />
      </div>
      <div className="flex items-center gap-3">
        <NetworkIndicator />
        {userName && (
          <span className="hidden sm:inline text-sm text-gray-500">{userName}</span>
        )}
        <WalletConnect />
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
