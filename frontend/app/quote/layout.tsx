import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import { ThemeCycleButton } from "@/components/ui/ThemeSwitcher";
import QuoteExplainer from "@/components/quote/QuoteExplainer";

export const metadata: Metadata = { title: "Get a free quote — ChainIns" };

/** Shared chrome for the public quote pages: no login needed to get an estimate. */
export default function QuoteLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mica relative min-h-screen overflow-x-clip">
      <header className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-4 sm:px-8">
        <Link href="/" className="rounded-[var(--radius-control)]">
          <Logo size={24} />
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeCycleButton />
          <Link href="/login" className="btn btn-accent">
            Log in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-4 pb-20 pt-4 sm:px-8">{children}</div>

      <QuoteExplainer />

      <footer className="mx-auto max-w-[1100px] px-4 pb-10 sm:px-8">
        <p className="t-caption text-fg-3">
          ChainIns is a student project. Prices on these pages are illustrative estimates; nothing you enter is sent or stored.
        </p>
      </footer>
    </main>
  );
}
