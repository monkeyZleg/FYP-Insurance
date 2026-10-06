"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDownRegular,
  ArrowRightRegular,
  CheckmarkCircleFilled,
  CheckmarkStarburstRegular,
  ClipboardTaskListLtrRegular,
  DismissRegular,
  DocumentArrowUpRegular,
  FingerprintRegular,
  LineHorizontal3Regular,
  LinkMultipleRegular,
  LockClosedKeyRegular,
  MoneyHandRegular,
  PeopleRegular,
  PersonSearchRegular,
  ReceiptSearchRegular,
  ShieldCheckmarkRegular,
  ShieldErrorRegular,
} from "@fluentui/react-icons";
import Mascot from "@/components/mascot/Mascot";
import Logo from "@/components/ui/Logo";
import { ThemeCycleButton } from "@/components/ui/ThemeSwitcher";
import Bloom from "@/components/landing/Bloom";
import LedgerWindow from "@/components/landing/LedgerWindow";
import TamperDemo from "@/components/landing/TamperDemo";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const JOURNEY_STEPS = [
  { label: "Submit", caption: "Upload your claim and supporting documents.", Icon: DocumentArrowUpRegular },
  { label: "Verify", caption: "Documents are hashed and recorded on-chain.", Icon: FingerprintRegular },
  { label: "Review", caption: "A claim officer checks the case.", Icon: PersonSearchRegular },
  { label: "Approve", caption: "The decision is recorded on-chain.", Icon: CheckmarkStarburstRegular },
  { label: "Settle", caption: "Payout is recorded on-chain.", Icon: MoneyHandRegular },
];

const ROLE_CARDS = [
  {
    Icon: ShieldCheckmarkRegular,
    role: "Policyholder",
    body: "Buy a policy, submit a claim, and track every step of your case.",
    can: ["Buy, renew & pay for policies", "File claims with hashed evidence", "Watch each status change land on-chain"],
    tint: "var(--accent-fill)",
  },
  {
    Icon: ClipboardTaskListLtrRegular,
    role: "Claim Verifier",
    body: "Review assigned claims and record an approve or reject decision.",
    can: ["Oldest-first review queue", "Signs decisions with MetaMask"],
    tint: "var(--cat-health)",
  },
  {
    Icon: PeopleRegular,
    role: "Admin",
    body: "Assign claims to verifiers and manage who has access.",
    can: ["Bulk-assign pending claims", "Settle approved payouts"],
    tint: "var(--cat-transport)",
  },
  {
    Icon: ReceiptSearchRegular,
    role: "Auditor",
    body: "Check the full on-chain record and flag claims for investigation.",
    can: ["Read-only audit trail", "Hash integrity checker"],
    tint: "var(--cat-life)",
  },
];

const WHY_BLOCKCHAIN = [
  {
    Icon: LockClosedKeyRegular,
    title: "Tamper-evident audit trail",
    body: "Every claim status change is recorded immutably on the Ethereum blockchain.",
  },
  {
    Icon: LinkMultipleRegular,
    title: "Duplicate-claim detection",
    body: "The same claim can't be quietly resubmitted or approved twice.",
  },
  {
    Icon: ShieldErrorRegular,
    title: "Transparent verification steps",
    body: "Anyone with a stake in the claim can check the record for themselves.",
  },
];

const STATEMENT =
  "Today, only the insurer can see what happened to your claim. Here, everyone with a stake in it — you, your verifier, an auditor — can check the record for themselves.";

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const statementRef = useRef<HTMLParagraphElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  // Moment A: hero assembles once on load (design spec Part 3.3.A).
  useEffect(() => {
    if (!heroRef.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        // Wait out the 2.7s cold-start splash; 0 on later client-side visits.
        .timeline({ delay: Math.max(0, 2.7 - performance.now() / 1000), defaults: { ease: "expo.out" } })
        .from(".hero-line", { yPercent: 110, duration: 1.1, stagger: 0.09 })
        .from(".hero-fade", { opacity: 0, y: 16, duration: 0.9, stagger: 0.08 }, "-=0.8")
        .from(".hero-visual", { opacity: 0, y: 40, scale: 0.97, duration: 1.2 }, "-=0.9")
        .from(".hero-underline", { strokeDashoffset: 420, duration: 1.2, ease: "power3.inOut" }, "-=1.1");
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Statement: words light up as the paragraph scrolls through the viewport.
  useEffect(() => {
    if (!statementRef.current) return;
    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>(".st-word");
      if (prefersReducedMotion()) {
        gsap.set(words, { opacity: 1 });
        return;
      }
      gsap.fromTo(
        words,
        { opacity: 0.16 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: { trigger: statementRef.current, start: "top 82%", end: "bottom 45%", scrub: 0.6 },
        }
      );
    }, statementRef);
    return () => ctx.revert();
  }, []);

  // Moment B: claim journey (design spec Part 3.3.B). The chain fills and the
  // mascot walks along it as the section scrolls past.
  useEffect(() => {
    if (!trackRef.current) return;
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      const steps = gsap.utils.toArray<HTMLElement>(".journey-step");
      if (reduced) {
        gsap.set(steps, { opacity: 1, y: 0 });
        steps.forEach((step) => step.classList.add("is-lit"));
        if (fillRef.current) gsap.set(fillRef.current, { scaleX: 1 });
        return;
      }
      steps.forEach((step, i) => {
        gsap.from(step, {
          opacity: 0,
          y: 24,
          duration: 0.8,
          ease: "expo.out",
          delay: i * 0.06,
          scrollTrigger: { trigger: step, start: "top 88%" },
        });
      });
      const st = { trigger: trackRef.current, start: "top 70%", end: "bottom 55%", scrub: 0.8 };
      if (fillRef.current) gsap.fromTo(fillRef.current, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: st });
      if (walkerRef.current) {
        gsap.to(walkerRef.current, {
          x: () => (trackRef.current?.querySelector(".journey-rail") as HTMLElement | null)?.offsetWidth ?? 0,
          ease: "none",
          scrollTrigger: { ...st, invalidateOnRefresh: true },
        });
      }
      ScrollTrigger.create({
        ...st,
        onUpdate: (self) =>
          steps.forEach((step, i) => step.classList.toggle("is-lit", self.progress >= i / (steps.length - 1) - 0.02)),
      });
    }, trackRef);
    return () => ctx.revert();
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <SiteNav />

      {/* ------------------------------------------------------------- Hero */}
      <section ref={heroRef} className="relative isolate pt-28 pb-24 sm:pt-36 lg:pb-32">
        <div aria-hidden className="absolute inset-0 -z-10 mica" />
        <div aria-hidden className="pointer-events-none absolute -z-10 right-[-30%] top-[-18%] w-[900px] max-w-none opacity-[0.55] dark:opacity-[0.5] sm:right-[-14%] lg:right-[-8%]">
          <Bloom className="w-full blur-[2px]" />
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-[var(--mica-base)]" />

        <div className="mx-auto grid max-w-[1240px] items-center gap-16 px-4 sm:px-8 lg:grid-cols-[1.08fr_1fr] lg:gap-12">
          <div className="min-w-0">
            <p className="hero-fade mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--control-stroke-secondary)] bg-[var(--control-fill)] py-1 pl-1 pr-3 t-caption text-fg-2 acrylic">
              <span className="badge badge-accent !h-5 shrink-0">BEICVS</span>
              <span className="truncate">
                <span className="hidden sm:inline">Blockchain-Enhanced </span>Insurance Claim Verification
              </span>
            </p>
            <h1 className="t-display text-fg [font-stretch:94%]">
              <span className="block overflow-hidden pb-[0.06em]">
                <span className="hero-line block">Claims you can</span>
              </span>
              <span className="block overflow-hidden pb-[0.12em]">
                <span className="hero-line block">
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-br from-[var(--accent-light-1)] via-[var(--accent-base)] to-[var(--accent-dark-2)] bg-clip-text text-transparent dark:from-[var(--accent-light-3)] dark:via-[var(--accent-light-2)] dark:to-[var(--accent-light-1)]">
                      verify
                    </span>
                    <svg aria-hidden viewBox="0 0 400 24" preserveAspectRatio="none" className="absolute -bottom-[0.08em] left-0 h-[0.18em] w-full overflow-visible">
                      <path
                        className="hero-underline"
                        d="M4 16 C 90 4, 220 4, 396 14"
                        fill="none"
                        stroke="var(--accent-fill)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray="420"
                        strokeDashoffset="0"
                        opacity="0.45"
                      />
                    </svg>
                  </span>
                  ,
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.06em]">
                <span className="hero-line block text-fg-2">not just trust.</span>
              </span>
            </h1>
            <p className="hero-fade mt-7 max-w-xl t-body-large text-fg-2">
              A tamper-proof, independently verifiable audit trail for insurance claims, anchored on the Ethereum
              blockchain.
            </p>
            <div className="hero-fade mt-9 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn btn-accent btn-xl nudge">
                Log in
                <ArrowRightRegular />
              </Link>
              <a href="#how-it-works" className="btn btn-xl">
                See how it works
              </a>
            </div>
            <ul className="hero-fade mt-10 flex flex-wrap gap-x-6 gap-y-2 t-body text-fg-2">
              {["SHA-256 document fingerprints", "Four role-based workspaces", "No wallet needed for policyholders"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckmarkCircleFilled fontSize={16} className="text-[var(--success)]" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-visual relative mx-auto w-full min-w-0 max-w-[520px] lg:max-w-none">
            <Mascot id="hero-mascot" mood="happy" className="absolute -bottom-12 -left-10 z-10 hidden h-20 w-20 drop-shadow-xl sm:block [animation:float-y_5s_ease-in-out_infinite]" />
            <LedgerWindow />
          </div>
        </div>

        <a
          href="#statement"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 t-caption text-fg-3 transition-colors hover:text-fg lg:flex"
        >
          <ArrowDownRegular className="[animation:float-y_2.4s_ease-in-out_infinite]" /> Scroll
        </a>
      </section>

      {/* --------------------------------------------------------- Statement */}
      <section id="statement" className="relative border-y border-[var(--divider-stroke)] bg-[var(--layer-fill)]">
        <div className="mx-auto max-w-[1100px] px-4 py-24 sm:px-8 sm:py-32">
          <p className="t-eyebrow mb-6">The problem, in one line</p>
          <p ref={statementRef} className="font-display text-[clamp(26px,3.6vw,46px)] font-semibold leading-[1.18] tracking-[-0.02em] text-fg">
            {STATEMENT.split(" ").map((w, i) => {
              const first = i < 11;
              return (
                <span key={i} className={`st-word inline ${first ? "text-[var(--critical)]" : ""}`}>
                  {w}{" "}
                </span>
              );
            })}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------ How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-8 sm:py-32">
          <SectionIntro
            eyebrow="How it works"
            title="One claim, five links in a chain."
            body="Every claim moves through the same verifiable sequence — each step locks into place on-chain. This is also a preview of what logging in unlocks."
          />

          <div ref={trackRef} className="relative mt-16">
            {/* rail */}
            <div className="journey-rail absolute left-[10%] right-[10%] top-7 hidden h-[3px] rounded-full bg-[var(--control-stroke-secondary)] md:block">
              <div ref={fillRef} className="h-full origin-left rounded-full bg-gradient-to-r from-[var(--accent-fill)] to-[var(--success)]" />
              <div ref={walkerRef} className="absolute -left-5 -top-[46px] h-10 w-10">
                <Mascot id="journey-walker-mascot" mood="neutral" className="h-10 w-10 drop-shadow-md" />
              </div>
            </div>
            <ol className="relative grid grid-cols-1 gap-4 md:grid-cols-5 md:gap-4">
              {JOURNEY_STEPS.map((step, i) => (
                <li key={step.label} className="journey-step group flex gap-4 md:flex-col md:items-center md:text-center">
                  <span className="journey-node relative z-[1] grid h-14 w-14 shrink-0 place-items-center rounded-[14px] border border-[var(--card-stroke)] bg-[var(--solid-quarternary)] text-fg-2 shadow-[var(--shadow-card)] transition-[background-color,color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.1,0.9,0.2,1)]">
                    <step.Icon fontSize={26} aria-hidden />
                  </span>
                  <span className="md:mt-4">
                    <span className="flex items-center gap-2 md:justify-center">
                      <span className="t-caption tabular-nums text-fg-3">0{i + 1}</span>
                      <span className="t-subtitle text-fg">{step.label}</span>
                    </span>
                    <span className="mt-1 block t-body text-fg-2 md:mx-auto md:max-w-[200px]">{step.caption}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Tamper demo */}
      <section id="try-it" className="relative isolate overflow-hidden border-y border-[var(--divider-stroke)] bg-[var(--layer-fill)]">
        <div aria-hidden className="pointer-events-none absolute -left-40 bottom-[-30%] -z-10 w-[640px] opacity-25 dark:opacity-30">
          <Bloom spin={false} className="w-full blur-2xl" />
        </div>
        <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-8 sm:py-32">
          <SectionIntro
            eyebrow="Try it yourself"
            title="Go on — try to quietly edit a claim."
            body="The claim below was fingerprinted with SHA-256 when it was submitted, and that fingerprint was anchored on-chain. Change anything and the fingerprints stop matching."
          />
          <div className="mt-12">
            <TamperDemo />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Roles */}
      <section id="for-roles" className="scroll-mt-20">
        <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-8 sm:py-32">
          <SectionIntro
            eyebrow="For insurers and their customers"
            title="Built for every role."
            body="One system, four working views — each person only sees the tools meant for them."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto]">
            {ROLE_CARDS.map((r, i) => (
              <article
                key={r.role}
                className={`card reveal group relative overflow-hidden p-6 transition-transform duration-500 ease-[cubic-bezier(0.1,0.9,0.2,1)] hover:-translate-y-1 ${
                  i === 0 ? "lg:col-span-2 lg:row-span-2 lg:p-8" : i === 1 ? "lg:col-span-2" : ""
                }`}
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-[10px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform duration-500 ease-[cubic-bezier(0.1,0.9,0.2,1)] group-hover:scale-105 group-hover:-rotate-3"
                  style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${r.tint} 70%, white), ${r.tint} 60%, color-mix(in srgb, ${r.tint} 80%, black))` }}
                >
                  <r.Icon fontSize={24} aria-hidden />
                </span>
                <h3 className={`mt-5 text-fg ${i === 0 ? "t-title" : "t-subtitle"}`}>{r.role}</h3>
                <p className={`mt-2 text-fg-2 ${i === 0 ? "t-body-large max-w-md" : "t-body"}`}>{r.body}</p>
                <ul className={`mt-5 flex flex-wrap gap-2 ${i === 0 ? "lg:mt-8" : ""}`}>
                  {r.can.map((c) => (
                    <li key={c} className="badge badge-outline !font-normal">
                      {c}
                    </li>
                  ))}
                </ul>
                {i === 0 && (
                  <Mascot
                    id="roles-mascot"
                    mood="happy"
                    className="pointer-events-none absolute -bottom-8 -right-6 hidden h-44 w-44 opacity-90 transition-transform duration-700 ease-[cubic-bezier(0.1,0.9,0.2,1)] group-hover:-translate-y-2 group-hover:-rotate-6 lg:block"
                  />
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Why blockchain */}
      <section className="border-t border-[var(--divider-stroke)]">
        <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-8 sm:py-32">
          <SectionIntro
            eyebrow="Why blockchain?"
            title="Not because it's trendy."
            body="Because a claim record that no single party can quietly edit is the whole point."
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-overlay)] border border-[var(--card-stroke)] bg-[var(--divider-stroke)] md:grid-cols-3">
            {WHY_BLOCKCHAIN.map((u, i) => (
              <div key={u.title} className="reveal bg-[var(--solid-tertiary)] p-7 dark:bg-[var(--solid-base)] sm:p-8">
                <div className="flex items-center justify-between">
                  <u.Icon fontSize={28} className="text-accent-text" aria-hidden />
                  <span className="font-display text-[44px] font-semibold leading-none tracking-tight text-[var(--control-stroke-secondary)] tabular-nums">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-8 t-subtitle text-fg">{u.title}</h3>
                <p className="mt-2 t-body text-fg-2">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- CTA */}
      <section className="px-4 pb-10 sm:px-8">
        <div className="relative isolate mx-auto max-w-[1240px] overflow-hidden rounded-[16px] border border-[var(--card-stroke)] px-6 py-20 text-center sm:px-12 sm:py-24">
          <div aria-hidden className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#142a73,#2a4fc4_45%,#6189f5)]" />
          <div aria-hidden className="pointer-events-none absolute -right-40 -top-56 -z-10 w-[720px] opacity-60 mix-blend-screen">
            <Bloom className="w-full" />
          </div>
          <Mascot id="cta-mascot" mood="happy" className="mx-auto mb-6 h-16 w-16 drop-shadow-xl" />
          <h2 className="mx-auto max-w-2xl font-display text-[clamp(30px,4.4vw,52px)] font-semibold leading-[1.1] tracking-[-0.025em] text-white">
            Ready to see your claim, verified?
          </h2>
          <p className="mx-auto mt-4 max-w-lg t-body-large text-white/75">
            Policyholders sign in with email. Staff connect a MetaMask wallet — no password needed.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="btn btn-xl nudge !border-transparent ![background-image:none] !bg-white !text-[#142a73] font-semibold hover:!bg-white/90"
            >
              Log in
              <ArrowRightRegular />
            </Link>
            <Link
              href="/register"
              className="btn btn-xl !border-white/25 ![background-image:none] !bg-white/10 !text-white hover:!bg-white/20"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Logo size={22} subtitle="Claim verification, on-chain" />
          <p className="max-w-xl t-caption text-fg-3 md:text-right">
            BEICVS — Blockchain-Enhanced Insurance Claim Verification System. All data is simulated for a student
            project; demonstration only.
          </p>
        </div>
      </footer>

      <style>{`
        .journey-step.is-lit .journey-node {
          background: var(--accent-fill);
          color: var(--text-on-accent);
          box-shadow: 0 0 0 6px var(--accent-subtle), 0 10px 24px -10px var(--accent-fill);
          transform: translateY(-2px);
        }
      `}</style>
    </main>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <p className="t-eyebrow mb-4">{eyebrow}</p>
      <h2 className="font-display text-[clamp(32px,4.6vw,56px)] font-semibold leading-[1.06] tracking-[-0.03em] text-fg [font-stretch:94%]">
        {title}
      </h2>
      <p className="mt-5 t-body-large text-fg-2">{body}</p>
    </div>
  );
}

function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#try-it", label: "Try it" },
    { href: "#for-roles", label: "For insurers" },
  ];

  return (
    <div className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6">
      <nav
        aria-label="Primary"
        className={`mx-auto flex h-14 max-w-[1240px] items-center gap-2 rounded-[12px] border pl-4 pr-2 transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled || open ? "acrylic border-[var(--surface-stroke-flyout)] shadow-flyout" : "border-transparent"
        }`}
      >
        <Link href="/" className="mr-4 rounded-[var(--radius-control)]">
          <Logo size={24} />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="btn btn-subtle text-fg-2 hover:text-fg">
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeCycleButton />
          <Link href="/register" className="btn btn-subtle hidden sm:inline-flex">
            Create account
          </Link>
          <Link href="/login" className="btn btn-accent">
            Log in
          </Link>
          <button
            type="button"
            className="btn btn-subtle btn-icon md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <DismissRegular /> : <LineHorizontal3Regular />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="surface-flyout acrylic mx-auto mt-2 max-w-[1240px] p-2 md:hidden pop-in">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center rounded-[var(--radius-control)] px-3 t-body text-fg hover:bg-[var(--subtle-fill-secondary)]"
            >
              {l.label}
            </a>
          ))}
          <Link href="/register" className="flex h-11 items-center rounded-[var(--radius-control)] px-3 t-body text-fg hover:bg-[var(--subtle-fill-secondary)]">
            Create account
          </Link>
        </div>
      )}
    </div>
  );
}
