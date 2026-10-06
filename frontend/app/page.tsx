"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EB_Garamond } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRightRegular,
  CheckmarkCircleFilled,
  ClipboardTaskListLtrRegular,
  DismissRegular,
  DocumentArrowUpRegular,
  LineHorizontal3Regular,
  LinkMultipleRegular,
  LockClosedKeyRegular,
  MoneyHandRegular,
  PeopleRegular,
  ReceiptSearchRegular,
  ShieldCheckmarkRegular,
  ShieldErrorRegular,
} from "@fluentui/react-icons";
import Mascot from "@/components/mascot/Mascot";
import Logo from "@/components/ui/Logo";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import Persona from "@/components/ui/Persona";
import { ThemeCycleButton } from "@/components/ui/ThemeSwitcher";
import Bloom from "@/components/landing/Bloom";
import TamperDemo from "@/components/landing/TamperDemo";
import Testimonials from "@/components/landing/Testimonials";
import ClaimStatusTracker from "@/components/claims/ClaimStatusTracker";
import HashDisplay from "@/components/blockchain/HashDisplay";
import StatusPill from "@/components/shared/StatusPill";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Landing headline only; declared here so no other route downloads it.
const serif = EB_Garamond({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });

// The phone in the hero: one claim told as a message thread.
const CHAT: { me?: boolean; text: string }[] = [
  { me: true, text: "Just submitted my hospital claim. Did it go through?" },
  { text: "Received. Claim CLM-0042, RM 8,450.00." },
  { text: "Your 2 documents are fingerprinted and anchored in block #1042." },
  { me: true, text: "Who's checking it?" },
  { text: "A claim verifier has it now. Every step shows up here as it happens." },
  { text: "Approved. The decision is recorded in block #1088." },
  { me: true, text: "And nobody can change that later?" },
  { text: "Nobody, including us. You can compare the fingerprint yourself any time." },
];

// What the policyholder sees at each step: tracker state + the one fact that step adds.
const block = (n: number) => <span className="ml-auto shrink-0 t-caption tabular-nums text-fg-3">block #{n}</span>;
const CLAIM_STEPS = [
  {
    label: "Submit",
    caption: "Upload your claim and supporting documents from any browser. You sign in with email, no crypto wallet needed.",
    status: "Submitted",
    detail: (
      <>
        <DocumentArrowUpRegular fontSize={18} aria-hidden />
        <span className="truncate">discharge-summary.pdf, itemised-bill.pdf</span>
        <span className="ml-auto shrink-0 t-caption text-fg-3">2 files</span>
      </>
    ),
  },
  {
    label: "Verify",
    caption: "Each document gets a SHA-256 fingerprint, and that fingerprint is anchored on-chain. Change one byte later and it stops matching.",
    status: "Submitted",
    detail: (
      <>
        <HashDisplay label="SHA-256" hash="0x9f3a1c7b2e58d04a6c1f93b7e2a85d4c0b6f17e39a2c84d5f0e1b7a3c96d285e" />
        {block(1042)}
      </>
    ),
  },
  {
    label: "Review",
    caption: "A claim officer is assigned and checks your case. You can see who has it and when it moved.",
    status: "UnderReview",
    detail: (
      <>
        <Persona name="Nur Aisyah" size={24} />
        <span className="truncate">Nur Aisyah, claim verifier</span>
        <span className="ml-auto shrink-0">
          <StatusPill status="UnderReview" />
        </span>
      </>
    ),
  },
  {
    label: "Approve",
    caption: "The verifier signs the decision with their own wallet, so it is recorded on-chain under their name.",
    status: "Approved",
    detail: (
      <>
        <CheckmarkCircleFilled fontSize={18} className="text-[var(--success)]" aria-hidden />
        <span className="truncate">Signed with the verifier&apos;s wallet</span>
        {block(1088)}
      </>
    ),
  },
  {
    label: "Settle",
    caption: "The payout is recorded on-chain. The full history stays readable to you, your verifier and an auditor.",
    status: "Settled",
    detail: (
      <>
        <MoneyHandRegular fontSize={18} aria-hidden />
        <span className="truncate">RM 8,450.00 paid out</span>
        {block(1103)}
      </>
    ),
  },
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

  // Moment A: hero assembles once on load (design spec Part 3.3.A).
  useEffect(() => {
    if (!heroRef.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap
        // Wait out the 2.7s cold-start splash; 0 on later client-side visits.
        .timeline({ delay: Math.max(0, 2.7 - performance.now() / 1000), defaults: { ease: "expo.out" } })
        .from(".hero-line", { yPercent: 110, duration: 1.1, stagger: 0.09 })
        .from(".hero-fade", { opacity: 0, y: 16, duration: 0.9, stagger: 0.08 }, "-=0.8")
        .from(".hero-visual", { opacity: 0, y: 40, scale: 0.97, duration: 1.2 }, "-=0.9");
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

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <SiteNav />

      {/* ------------------------------------------------------------- Hero */}
      <section ref={heroRef} className="relative isolate pt-32 pb-24 sm:pt-40 lg:pb-32">
        <div aria-hidden className="absolute inset-0 -z-10 mica" />
        <div aria-hidden className="pointer-events-none absolute bottom-[-6%] left-1/2 -z-10 w-[980px] max-w-none -translate-x-1/2 opacity-[0.4]">
          <Bloom className="w-full blur-[3px]" />
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-[var(--mica-base)]" />

        <div className="mx-auto max-w-[980px] px-4 text-center sm:px-8">
          <p className="hero-fade inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--control-stroke-secondary)] bg-[var(--control-fill)] py-1 pl-1 pr-3 t-caption text-fg-2 acrylic">
            <span className="badge badge-accent !h-5 shrink-0">BEICVS</span>
            <span className="truncate">
              <span className="hidden sm:inline">Blockchain-Enhanced </span>Insurance Claim Verification
            </span>
          </p>
          <h1 className={`${serif.className} mt-7 text-[clamp(40px,7.4vw,92px)] font-medium leading-[0.98] tracking-[-0.03em] text-fg`}>
            {/* padding keeps the descenders inside the reveal mask; the negative margin takes it back */}
            <span className="block overflow-hidden pb-[0.22em]">
              <span className="hero-line block">Claims you can verify,</span>
            </span>
            <span className="-mt-[0.2em] block overflow-hidden pb-[0.22em]">
              <span className="hero-line block italic">not just trust.</span>
            </span>
          </h1>
          <p className="hero-fade mx-auto mt-5 max-w-[540px] t-body-large text-fg-2">
            A tamper-proof, independently verifiable audit trail for insurance claims, anchored on the Ethereum
            blockchain.
          </p>
          <div className="hero-fade mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn btn-accent btn-xl nudge !rounded-full">
              Log in
              <ArrowRightRegular />
            </Link>
            <a href="#how-it-works" className="btn btn-xl !rounded-full">
              See how it works
            </a>
          </div>
        </div>

        <div className="hero-visual mt-16 px-4">
          <ChatPhone />
        </div>
      </section>

      <ClaimSteps />

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

      {/* ---------------------------------------------------------- Feedback */}
      <Testimonials serifClassName={serif.className} />

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

/** Phone mock-up whose thread plays one claim from submission to approval, then loops. */
function ChatPhone() {
  // Half-steps: on an odd tick the next reply is still "typing".
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTick(CHAT.length * 2);
      return;
    }
    const id = setInterval(() => setTick((t) => (t >= CHAT.length * 2 + 5 ? 0 : t + 1)), 750);
    return () => clearInterval(id);
  }, []);
  const next = CHAT[tick >> 1];
  const typing = tick % 2 === 1 && next && !next.me;
  // Thread fills from the top like a new conversation, then follows the newest message.
  const threadRef = useRef<HTMLDivElement>(null);
  // Block body on purpose: Element.scrollTo() returns a Promise in recent
  // browsers, and an effect must return nothing or a cleanup function.
  useEffect(() => {
    const thread = threadRef.current;
    thread?.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [tick]);

  return (
    <div
      role="img"
      aria-label="Example message thread: a policyholder submits a claim, its documents are fingerprinted on-chain, and the approval is recorded."
      className="relative mx-auto flex h-[620px] w-[310px] max-w-full flex-col overflow-hidden rounded-[52px] border-[9px] border-[#15161a] bg-[var(--solid-quarternary)] shadow-window dark:border-[#34353b]"
    >
      <span className="absolute left-1/2 top-2.5 h-7 w-24 -translate-x-1/2 rounded-full bg-[#15161a] dark:bg-black" />
      <div className="flex flex-col items-center border-b border-[var(--divider-stroke)] pb-2.5 pt-12">
        <Mascot id="chat-mascot" mood="happy" className="h-10 w-10" />
        <span className="mt-1 t-caption font-semibold text-fg">BEICVS</span>
      </div>
      <div ref={threadRef} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-3 py-3 text-left text-[14px] leading-[19px]">
        {CHAT.slice(0, tick >> 1).map((m) => (
          <p
            key={m.text}
            className={`enter max-w-[82%] shrink-0 rounded-[18px] px-3 py-2 ${
              m.me ? "self-end rounded-br-[6px] bg-[var(--accent-fill)] text-on-accent" : "self-start rounded-bl-[6px] bg-[var(--control-alt-fill-tertiary)] text-fg"
            }`}
          >
            {m.text}
          </p>
        ))}
        {typing && (
          <p className="flex shrink-0 gap-1 self-start rounded-[18px] rounded-bl-[6px] bg-[var(--control-alt-fill-tertiary)] px-3.5 py-3">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-secondary)]" style={{ animationDelay: `${d}ms` }} />
            ))}
          </p>
        )}
      </div>
      <div className="mx-3 mb-4 flex h-9 items-center rounded-full border border-[var(--control-stroke-secondary)] px-4 t-body text-fg-3">Message</div>
    </div>
  );
}

/**
 * How it works: the list stays pinned while the claim card on the right scrolls
 * through its five states. The rule under the open step fills as you read it.
 */
function ClaimSteps() {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const visualsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const n = CLAIM_STEPS.length;
    const st = ScrollTrigger.create({
      trigger: visualsRef.current,
      start: "top 55%",
      end: "bottom 55%",
      onUpdate: (self) => {
        const at = Math.min(self.progress * n, n - 0.001); // 2.4 = step 3, 40% read
        setActive(Math.floor(at));
        listRef.current?.style.setProperty("--fill", String(at % 1));
      },
    });
    return () => st.kill();
  }, []);

  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-[var(--divider-stroke)]">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-24 sm:px-8 sm:py-32 lg:grid-cols-[400px_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="flex items-center gap-2.5 t-body text-fg">
            <span className="grid h-7 w-7 place-items-center rounded-[6px] bg-[var(--accent-subtle-strong)] text-accent-text">
              <ShieldCheckmarkRegular fontSize={16} aria-hidden />
            </span>
            Your claim, step by step
          </p>
          <h2 className="mt-5 font-display text-[clamp(24px,2.5vw,32px)] font-semibold leading-[1.22] tracking-[-0.02em] text-fg">
            Submit once.{" "}
            <span className="font-medium text-fg-3">Then watch every step lock into a record nobody can quietly edit.</span>
          </h2>
          <ol ref={listRef} className="mt-9 hidden border-t border-[var(--divider-stroke)] lg:block">
            {CLAIM_STEPS.map((s, i) => (
              <li key={s.label} className="relative border-b border-[var(--divider-stroke)]">
                <a href={`#step-${i}`} aria-current={active === i ? "step" : undefined} className="block rounded-[var(--radius-control)] py-4">
                  <span className={`t-body-large transition-colors duration-300 ${active === i ? "font-semibold text-fg" : "text-fg-2 hover:text-fg"}`}>{s.label}</span>
                  <span className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.1,0.9,0.2,1)] ${active === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <span className="overflow-hidden">
                      <span className="block pb-1 pt-2 t-body text-fg-2">{s.caption}</span>
                    </span>
                  </span>
                </a>
                {active === i && (
                  <span aria-hidden className="absolute -bottom-px left-0 h-[2px] w-full origin-left bg-[var(--accent-fill)]" style={{ transform: "scaleX(var(--fill, 0))" }} />
                )}
              </li>
            ))}
          </ol>
        </div>

        <div ref={visualsRef} className="space-y-6">
          {CLAIM_STEPS.map((s, i) => (
            <div key={s.label} id={`step-${i}`} className="scroll-mt-28">
              <div className="mb-3 lg:hidden">
                <h3 className="t-subtitle text-fg">{s.label}</h3>
                <p className="mt-1 t-body text-fg-2">{s.caption}</p>
              </div>
              <div
                className="grid place-items-center rounded-[20px] px-4 py-12 sm:px-10 lg:min-h-[64vh]"
                style={{ background: `linear-gradient(${115 + i * 35}deg, #0e1d52, #1f3c9c 42%, #3a63e0)` }}
              >
                <div className="w-full max-w-[480px] rounded-[12px] bg-[var(--solid-quarternary)] p-5 shadow-dialog">
                  <div className="flex items-center gap-3">
                    <CategoryGlyph type="health" variant="solid" size={40} />
                    <div className="min-w-0">
                      <p className="truncate t-body-strong text-fg">Inpatient · Pantai Hospital KL</p>
                      <p className="t-caption text-fg-2">Claim CLM-0042 · RM 8,450.00</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <ClaimStatusTracker status={s.status} />
                  </div>
                  <div className="mt-6 flex min-h-11 items-center gap-2.5 border-t border-[var(--divider-stroke)] pt-4 t-body text-fg-2">{s.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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
