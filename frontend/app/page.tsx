"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Mascot from "@/components/mascot/Mascot";
import { prefersReducedMotion, safeTimeline } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const JOURNEY_STEPS = [
  { label: "Submit", detail: "doc" },
  { label: "Verify", detail: "hash" },
  { label: "Review", detail: "officer" },
  { label: "Approve", detail: "chain" },
  { label: "Settle", detail: "chain" },
];

const USPS = [
  { icon: "🔒", title: "Tamper-Proof", body: "Every claim status change is recorded immutably on the Ethereum blockchain." },
  { icon: "🔍", title: "Transparent", body: "Full audit trail accessible to authorized auditors at any time." },
  { icon: "✅", title: "Verifiable", body: "Document integrity verified through SHA-256 hashing anchored on-chain." },
];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);

  // Moment A: hero chain of blocks assembling, plays once on load (design spec Part 3.3.A).
  useEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      safeTimeline((tl) => {
        tl.from(".block", { y: -40, opacity: 0, stagger: 0.15, duration: 0.5, ease: "back.out(1.6)" })
          .from(
            ".block-link",
            { scaleX: 0, transformOrigin: "left center", duration: 0.3, stagger: 0.15, ease: "back.out(1.6)" },
            "-=0.3"
          );
        if (!prefersReducedMotion()) {
          tl.to("#hero-mascot", { y: -8, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 }, "-=0.2");
        }
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Moment B: claim journey timeline, scroll-driven on this "How it works" section
  // (design spec Part 3.3.B). Steps fade in as they enter view; the mascot walks
  // left-to-right along the track as the user scrolls past it.
  useEffect(() => {
    if (!trackRef.current) return;
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      const steps = gsap.utils.toArray<HTMLElement>(".journey-step");

      steps.forEach((step) => {
        if (reduced) {
          gsap.set(step, { opacity: 1, x: 0 });
          return;
        }
        gsap.from(step, {
          opacity: 0,
          x: -20,
          duration: 0.4,
          scrollTrigger: { trigger: step, start: "top 80%" },
        });
      });

      if (walkerRef.current && trackRef.current) {
        if (reduced) {
          gsap.set(walkerRef.current, { x: trackRef.current.offsetWidth });
        } else {
          gsap.to(walkerRef.current, {
            x: () => trackRef.current!.offsetWidth - 32,
            ease: "none",
            scrollTrigger: {
              trigger: trackRef.current,
              start: "top 60%",
              end: "bottom 60%",
              scrub: 1,
            },
          });
        }
      }
    }, trackRef);
    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen bg-cloud">
      <nav className="flex items-center justify-between px-6 md:px-8 py-4 bg-white border-b border-border">
        <span className="text-xl font-bold text-ink font-display">BEICVS</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-ink hover:text-chain-indigo transition-colors">
            Login
          </Link>
          <Link
            href="/register"
            className="bg-amber-spark text-ink text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#E89D14] transition-colors"
          >
            Get Covered
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div ref={heroRef} className="max-w-[1200px] mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-ink font-display mb-4 leading-tight">
          Claims you can verify,
          <br />
          not just trust.
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
          A tamper-proof, independently verifiable audit trail for insurance claims, anchored on the Ethereum
          blockchain.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <Link
            href="/register"
            className="bg-amber-spark text-ink font-semibold px-6 py-3 rounded-lg hover:bg-[#E89D14] transition-colors"
          >
            Get Covered
          </Link>
          <Link
            href="/login"
            className="border border-border bg-white text-ink font-semibold px-6 py-3 rounded-lg hover:border-chain-indigo transition-colors"
          >
            Track My Claim
          </Link>
        </div>

        {/* Chain-block hero animation */}
        <div className="relative flex items-center justify-center gap-0 flex-wrap max-w-2xl mx-auto mb-6">
          {["Submitted", "Verified", "Approved", "Settled"].map((label, i, arr) => (
            <div key={label} className="flex items-center">
              <div className="block flex flex-col items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-chain-indigo text-white shadow-sm">
                <span className="text-2xl mb-1">⛓️</span>
                <span className="text-xs font-medium">{label}</span>
              </div>
              {i < arr.length - 1 && <div className="block-link h-1 w-6 md:w-10 bg-ledger-mint rounded-full mx-1" />}
            </div>
          ))}
        </div>
        <Mascot id="hero-mascot" mood="happy" className="w-16 h-16 mx-auto" />
      </div>

      {/* USPs */}
      <div className="max-w-[1200px] mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USPS.map((u) => (
            <div key={u.title} className="bg-white rounded-xl border border-border p-6">
              <div className="text-3xl mb-3">{u.icon}</div>
              <h3 className="font-semibold text-lg mb-2 text-ink font-display">{u.title}</h3>
              <p className="text-sm text-gray-500">{u.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works — claim journey (Moment B) */}
      <div className="bg-white border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-ink font-display text-center mb-2">How it works</h2>
          <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">
            Every claim moves through the same verifiable sequence — each step locks into place on-chain.
          </p>

          <div ref={trackRef} className="journey-track relative max-w-4xl mx-auto">
            <div className="absolute left-0 right-0 top-6 h-0.5 bg-border hidden sm:block" />
            <div
              ref={walkerRef}
              className="hidden sm:flex absolute top-0 w-8 h-8 items-center justify-center"
              style={{ left: -16 }}
            >
              <Mascot id="journey-walker-mascot" mood="neutral" className="w-8 h-8" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-8 sm:gap-4 relative">
              {JOURNEY_STEPS.map((step, i) => (
                <div key={step.label} className="journey-step flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                  <div className="w-12 h-12 rounded-full bg-chain-indigo text-white flex items-center justify-center font-semibold shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-ink">{step.label}</p>
                    <p className="text-xs text-gray-400">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="max-w-[1200px] mx-auto px-6 py-10 text-center text-xs text-gray-400">
        BEICVS — Blockchain-Enhanced Insurance Claim Verification System. Demonstration project only.
      </footer>
    </main>
  );
}
