import Link from "next/link";
import type { ReactNode } from "react";
import { CheckmarkCircleFilled } from "@fluentui/react-icons";
import Bloom from "@/components/landing/Bloom";
import Logo from "@/components/ui/Logo";
import { ThemeCycleButton } from "@/components/ui/ThemeSwitcher";

const POINTS = [
  "Every status change is written to Ethereum",
  "Documents are fingerprinted with SHA-256",
  "Anyone with a stake can check the record",
];

/** Split sign-in layout: luminous brand panel + form on Mica. */
export default function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="mica relative grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-10 xl:p-14 text-white">
        <div aria-hidden className="absolute inset-0 -z-20 bg-[linear-gradient(150deg,#0e1d52_0%,#1f3c9c_42%,#3a63e0_100%)]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-80 -right-72 -z-10 w-[820px] opacity-70 mix-blend-screen">
          <Bloom className="w-full" />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <Link href="/" className="w-fit rounded-[var(--radius-control)] [&_.text-fg]:!text-white">
          <Logo size={28} />
        </Link>
        <div className="enter max-w-md">
          {aside ?? (
            <>
              <h2 className="font-display text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] text-white [font-stretch:94%]">
                Every claim, on the record.
              </h2>
              <ul className="mt-8 space-y-3">
                {POINTS.map((p) => (
                  <li key={p} className="flex items-center gap-3 t-body-large text-white/85">
                    <CheckmarkCircleFilled fontSize={20} className="shrink-0 text-[#93b1ff]" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <p className="t-caption text-white/55">Student project — all data is simulated. Demonstration only.</p>
      </aside>

      <div className="relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/" className="rounded-[var(--radius-control)] lg:invisible">
            <Logo size={24} />
          </Link>
          <ThemeCycleButton />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 pt-4 sm:px-6">{children}</div>
      </div>
    </main>
  );
}
