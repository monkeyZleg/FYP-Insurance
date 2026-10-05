"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AddCircleFilled,
  AddCircleRegular,
  ArrowSwapRegular,
  CartFilled,
  CartRegular,
  ClipboardTaskListLtrFilled,
  ClipboardTaskListLtrRegular,
  DismissRegular,
  DocumentBulletListFilled,
  DocumentBulletListRegular,
  DocumentMultipleFilled,
  DocumentMultipleRegular,
  FingerprintFilled,
  FingerprintRegular,
  HomeFilled,
  HomeRegular,
  LineHorizontal3Regular,
  PeopleFilled,
  PeopleRegular,
  PersonArrowRightFilled,
  PersonArrowRightRegular,
  ReceiptSearchFilled,
  ReceiptSearchRegular,
  SearchRegular,
  SignOutRegular,
  TaskListSquareLtrFilled,
  TaskListSquareLtrRegular,
} from "@fluentui/react-icons";
import type { UserRole } from "@/types";
import { useRole } from "@/hooks/useRole";
import Logo from "@/components/ui/Logo";
import Persona from "@/components/ui/Persona";
import ThemeSwitcher, { ThemeCycleButton } from "@/components/ui/ThemeSwitcher";
import WalletConnect from "@/components/shared/WalletConnect";
import NetworkIndicator from "@/components/blockchain/NetworkIndicator";
import { ROLE_LABELS } from "@/components/shared/RoleBadge";

type Icon = typeof HomeRegular;
type NavItem = { label: string; href: string; icon: Icon; iconActive: Icon; also?: string[] };
type NavGroup = { header?: string; items: NavItem[] };

const NAV: Record<UserRole, NavGroup[]> = {
  policyholder: [
    { items: [{ label: "Overview", href: "/dashboard/policyholder", icon: HomeRegular, iconActive: HomeFilled }] },
    {
      header: "Policies",
      items: [
        { label: "My policies", href: "/dashboard/policyholder/policies", icon: DocumentBulletListRegular, iconActive: DocumentBulletListFilled },
        {
          label: "Buy a policy",
          href: "/dashboard/policyholder/policies/plans",
          icon: CartRegular,
          iconActive: CartFilled,
          also: ["/dashboard/policyholder/policies/purchase"],
        },
      ],
    },
    {
      header: "Claims",
      items: [
        { label: "My claims", href: "/dashboard/policyholder/claims", icon: ClipboardTaskListLtrRegular, iconActive: ClipboardTaskListLtrFilled },
        { label: "New claim", href: "/dashboard/policyholder/claims/new", icon: AddCircleRegular, iconActive: AddCircleFilled },
        { label: "My documents", href: "/dashboard/policyholder/documents", icon: DocumentMultipleRegular, iconActive: DocumentMultipleFilled },
      ],
    },
  ],
  verifier: [{ items: [{ label: "Claims queue", href: "/dashboard/verifier", icon: TaskListSquareLtrRegular, iconActive: TaskListSquareLtrFilled }] }],
  admin: [
    {
      items: [
        { label: "Overview", href: "/dashboard/admin", icon: HomeRegular, iconActive: HomeFilled },
        { label: "Users", href: "/dashboard/admin/users", icon: PeopleRegular, iconActive: PeopleFilled },
        { label: "Assign & settle", href: "/dashboard/admin/assign", icon: PersonArrowRightRegular, iconActive: PersonArrowRightFilled },
      ],
    },
  ],
  auditor: [
    {
      items: [
        { label: "Audit trail", href: "/dashboard/auditor", icon: ReceiptSearchRegular, iconActive: ReceiptSearchFilled },
        { label: "Hash checker", href: "/dashboard/auditor/verify", icon: FingerprintRegular, iconActive: FingerprintFilled },
      ],
    },
  ],
};

function activeHref(groups: NavGroup[], pathname: string) {
  let best: { href: string; len: number } | null = null;
  for (const g of groups)
    for (const it of g.items)
      for (const p of [it.href, ...(it.also || [])])
        if ((pathname === p || pathname.startsWith(p + "/")) && (!best || p.length > best.len)) best = { href: it.href, len: p.length };
  return best?.href ?? null;
}

/**
 * WinUI 3 NavigationView shell: Mica window, title bar, left pane (expanded /
 * compact rail / overlay on small screens), and a content layer whose top-left
 * corner is rounded where it meets the pane.
 */
export default function AppShell({ role, children }: { role: UserRole; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userName, logout } = useRole();
  const groups = NAV[role];
  const current = activeHref(groups, pathname);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const [compact, setCompact] = useState(false);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompact(localStorage.getItem("navCompact") === "1");
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverlay(false);
  }, [pathname]);

  function toggle() {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setCompact((c) => {
        try {
          localStorage.setItem("navCompact", c ? "0" : "1");
        } catch {}
        return !c;
      });
    } else setOverlay((o) => !o);
  }

  const displayName = userName || ROLE_LABELS[role];
  const staff = role !== "policyholder";

  return (
    <div className="mica flex min-h-screen flex-col">
      {/* Title bar */}
      <header className="mica sticky top-0 z-30 flex h-12 shrink-0 items-center gap-1 px-1.5">
        <button type="button" onClick={toggle} className="btn btn-subtle btn-icon w-10 h-9" aria-label="Toggle navigation" aria-expanded={overlay || !compact}>
          <LineHorizontal3Regular fontSize={18} />
        </button>
        <Link href={flat[0].href} className="ml-1 mr-3 flex items-center rounded-[var(--radius-control)] px-1">
          <Logo size={20} />
        </Link>
        <span className="hidden sm:inline t-caption text-fg-2">{ROLE_LABELS[role]} workspace</span>
        <div className="ml-auto flex items-center gap-2 pr-1">
          {staff && <NetworkIndicator />}
          {staff && <WalletConnect compact />}
          <ThemeCycleButton className="md:hidden" />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Pane: rail/expanded on md+, overlay below md */}
        <Pane
          compact={compact}
          overlay={overlay}
          onCloseOverlay={() => setOverlay(false)}
          groups={groups}
          current={current}
          displayName={displayName}
          role={role}
          flat={flat}
          onNavigate={(href) => router.push(href)}
          onSignOut={logout}
        />

        <main
          className="relative min-w-0 flex-1 md:rounded-tl-[var(--radius-overlay)] border-t md:border-l border-[var(--card-stroke)] bg-[var(--layer-fill)] dark:bg-[rgba(39,39,39,0.3)]"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          <div key={pathname} className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Pane({
  compact,
  overlay,
  onCloseOverlay,
  groups,
  current,
  displayName,
  role,
  flat,
  onNavigate,
  onSignOut,
}: {
  compact: boolean;
  overlay: boolean;
  onCloseOverlay: () => void;
  groups: NavGroup[];
  current: string | null;
  displayName: string;
  role: UserRole;
  flat: NavItem[];
  onNavigate: (href: string) => void;
  onSignOut: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ y: number } | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const rail = compact && !overlay;

  const measure = useCallback(() => {
    const el = current ? listRef.current?.querySelector<HTMLElement>(`[data-href="${current}"]`) : null;
    setIndicator(el ? { y: el.offsetTop + el.offsetHeight / 2 - 8 } : null);
  }, [current]);

  useLayoutEffect(() => {
    measure();
  }, [measure, rail, overlay]);

  // "/" or Ctrl+K focuses the page finder, like Settings' search box
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && overlay) onCloseOverlay();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [overlay, onCloseOverlay]);

  const matches = query.trim() ? flat.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return (
    <>
      {overlay && <div className="fixed inset-0 z-40 bg-[var(--smoke)] md:hidden" style={{ animation: "smoke-in 167ms linear both" }} onClick={onCloseOverlay} aria-hidden />}
      <nav
        aria-label="Main"
        className={`flex shrink-0 flex-col transition-[width,transform] duration-300 ease-[cubic-bezier(0.1,0.9,0.2,1)] ${
          overlay
            ? "fixed inset-y-0 left-0 z-50 w-[300px] translate-x-0 acrylic border-r border-[var(--surface-stroke-flyout)] shadow-dialog pt-1"
            : "fixed inset-y-0 left-0 z-50 w-[300px] -translate-x-full md:sticky md:top-12 md:z-auto md:h-[calc(100vh-48px)] md:translate-x-0"
        } ${!overlay ? (rail ? "md:w-12" : "md:w-[280px]") : ""}`}
      >
        {overlay && (
          <div className="flex h-12 items-center gap-1 px-1.5">
            <button type="button" onClick={onCloseOverlay} className="btn btn-subtle btn-icon w-10 h-9" aria-label="Close navigation">
              <DismissRegular fontSize={18} />
            </button>
            <span className="ml-2">
              <Logo size={20} />
            </span>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-1 pb-2">
          {/* account */}
          {!rail ? (
            <div className="flex items-center gap-3 px-3 pt-3 pb-4">
              <Persona name={displayName} size={44} />
              <div className="min-w-0">
                <p className="t-body-strong text-fg truncate">{displayName}</p>
                <p className="t-caption text-fg-2 truncate">{ROLE_LABELS[role]}</p>
              </div>
            </div>
          ) : (
            <div className="grid place-items-center py-3" title={displayName}>
              <Persona name={displayName} size={28} />
            </div>
          )}

          {/* find a page */}
          {!rail && (
            <div className="relative mx-2 mb-3">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && matches[0]) {
                    onNavigate(matches[0].href);
                    setQuery("");
                    searchRef.current?.blur();
                  }
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder="Find a page"
                aria-label="Find a page"
                className="textbox pr-16"
                role="combobox"
                aria-expanded={matches.length > 0}
                aria-controls="nav-find-results"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-fg-2">
                {!query && <kbd className="kbd">/</kbd>}
                <SearchRegular fontSize={16} />
              </span>
              {matches.length > 0 && (
                <ul id="nav-find-results" role="listbox" className="surface-flyout absolute inset-x-0 top-full z-10 mt-1 p-1 fade-in">
                  {matches.map((m) => (
                    <li key={m.href}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onNavigate(m.href);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left t-body text-fg hover:bg-[var(--subtle-fill-secondary)]"
                      >
                        <m.icon fontSize={16} className="text-fg-2" />
                        {m.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div ref={listRef} className="relative">
            {indicator && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-1 z-[1] h-4 w-[3px] rounded-full bg-[var(--accent-fill)] transition-transform duration-[333ms] ease-[cubic-bezier(0.55,0.55,0,1)]"
                style={{ transform: `translateY(${indicator.y}px)`, top: 0 }}
              />
            )}
            {groups.map((g, gi) => (
              <div key={gi} className={gi > 0 ? "mt-1" : ""}>
                {g.header &&
                  (rail ? (
                    <div className="mx-3 my-2 h-px bg-[var(--divider-stroke)]" />
                  ) : (
                    <p className="px-4 pt-3 pb-1 t-body-strong text-fg">{g.header}</p>
                  ))}
                {g.items.map((it) => {
                  const active = it.href === current;
                  const Icon = active ? it.iconActive : it.icon;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      data-href={it.href}
                      aria-current={active ? "page" : undefined}
                      title={rail ? it.label : undefined}
                      className={`group relative my-0.5 flex h-9 items-center gap-4 rounded-[var(--radius-control)] t-body transition-colors duration-100 ${
                        rail ? "justify-center px-0" : "px-3"
                      } ${active ? "bg-[var(--subtle-fill-secondary)] text-fg" : "text-fg hover:bg-[var(--subtle-fill-secondary)] active:bg-[var(--subtle-fill-tertiary)] active:text-fg-2"}`}
                    >
                      <Icon
                        fontSize={18}
                        className={`shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.1,0.9,0.2,1)] group-active:scale-90 ${active ? "text-accent-text" : ""}`}
                      />
                      {!rail && <span className="truncate">{it.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="border-t border-[var(--divider-stroke)] px-1 py-2">
          {!rail && (
            <div className="px-2 pb-2">
              <ThemeSwitcher />
            </div>
          )}
          {rail && (
            <div className="grid place-items-center pb-1">
              <ThemeCycleButton />
            </div>
          )}
          <Link
            href="/login"
            title="Demo convenience — not part of the real product"
            className={`my-0.5 flex h-9 items-center gap-4 rounded-[var(--radius-control)] t-body text-fg-2 transition-colors hover:bg-[var(--subtle-fill-secondary)] hover:text-fg ${
              rail ? "justify-center" : "px-3"
            }`}
          >
            <ArrowSwapRegular fontSize={18} className="shrink-0" />
            {!rail && "Switch demo account"}
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            title={rail ? "Sign out" : undefined}
            className={`my-0.5 flex h-9 w-full items-center gap-4 rounded-[var(--radius-control)] t-body text-fg transition-colors hover:bg-[var(--subtle-fill-secondary)] ${
              rail ? "justify-center" : "px-3"
            }`}
          >
            <SignOutRegular fontSize={18} className="shrink-0" />
            {!rail && "Sign out"}
          </button>
        </div>
      </nav>
    </>
  );
}
