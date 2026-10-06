"use client";
import { useEffect, useState } from "react";
import {
  CheckmarkRegular,
  DismissRegular,
  MaximizeRegular,
  ShieldCheckmarkFilled,
  SubtractRegular,
} from "@fluentui/react-icons";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import { LogoMark } from "@/components/ui/Logo";
import Spinner from "@/components/ui/Spinner";

const HEX = "0123456789abcdef";
const BLOCKS = [
  { label: "Submitted", who: "Policyholder · via relayer", block: 1042 },
  { label: "Verifier assigned", who: "Insurance admin", block: 1057 },
  { label: "Approved", who: "Claim verifier", block: 1088 },
  { label: "Settled", who: "Insurance admin", block: 1103 },
];

function randomHash(n = 10) {
  let s = "0x";
  for (let i = 0; i < n; i++) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}

/**
 * Hero visual: a WinUI window showing one claim being written to the chain,
 * block by block, finished with a Windows-style toast.
 */
export default function LedgerWindow() {
  const [stage, setStage] = useState(0); // number of confirmed blocks
  const [hashes, setHashes] = useState<string[]>(() => BLOCKS.map((_, i) => `0x${(0x9f3a1c7b2e + i * 0x1d4f7).toString(16).slice(0, 10)}`));
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage(BLOCKS.length);
      setToast(true);
      return;
    }
    let s = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // the pending block's hash "mines": it scrambles until the block confirms
    const scramble = setInterval(() => {
      setHashes((h) => h.map((v, i) => (i === s ? randomHash() : v)));
    }, 90);
    function next() {
      s += 1;
      setStage(s);
      if (s < BLOCKS.length) timers.push(setTimeout(next, 1100));
      else {
        clearInterval(scramble);
        timers.push(setTimeout(() => setToast(true), 500));
      }
    }
    timers.push(setTimeout(next, 900));
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(scramble);
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[var(--radius-window)] border border-[var(--surface-stroke-flyout)] shadow-window acrylic">
        {/* title bar */}
        <div className="flex h-9 items-center gap-2 pl-3">
          <LogoMark size={16} />
          <span className="t-caption text-fg">Claim CLM-0042 — ChainIns</span>
          <div className="ml-auto flex h-full text-fg">
            {[SubtractRegular, MaximizeRegular, DismissRegular].map((Icon, i) => (
              <span key={i} className={`grid h-full w-11 place-items-center ${i === 2 ? "hover:bg-[#c42b1c] hover:text-white" : "hover:bg-[var(--subtle-fill-secondary)]"}`}>
                <Icon fontSize={14} aria-hidden />
              </span>
            ))}
          </div>
        </div>

        <div className="mx-1 mb-1 rounded-[6px] border border-[var(--card-stroke)] bg-[var(--layer-fill-alt)] dark:bg-[rgba(39,39,39,0.6)] p-4 sm:p-5">
          {/* claim header */}
          <div className="flex items-center gap-3">
            <CategoryGlyph type="health" variant="solid" size={40} />
            <div className="min-w-0 flex-1">
              <p className="t-body-strong text-fg truncate">Inpatient · Pantai Hospital KL</p>
              <p className="t-caption text-fg-2">Policy POL-2026-00123 · RM 8,450.00</p>
            </div>
            <span className={`badge ${stage >= 4 ? "badge-success" : stage >= 3 ? "badge-success" : "badge-caution"} transition-colors`}>
              {stage >= 4 ? "Settled" : stage >= 3 ? "Approved" : "In review"}
            </span>
          </div>

          {/* chain */}
          <ol className="relative mt-5 space-y-2">
            <span aria-hidden className="absolute left-[19px] top-5 bottom-5 w-[2px] rounded-full bg-[var(--control-stroke-secondary)]" />
            <span
              aria-hidden
              className="absolute left-[19px] top-5 w-[2px] rounded-full bg-[var(--success)] transition-[height] duration-700 ease-[cubic-bezier(0.1,0.9,0.2,1)]"
              style={{ height: `calc(${(Math.max(0, Math.min(stage, BLOCKS.length) - 1) / (BLOCKS.length - 1)) * 100}% - ${stage >= BLOCKS.length ? 40 : 20}px)` }}
            />
            {BLOCKS.map((b, i) => {
              const done = i < stage;
              const pending = i === stage;
              return (
                <li
                  key={b.label}
                  className={`relative flex items-center gap-3 rounded-[6px] px-2 py-2 transition-[background-color,opacity] duration-500 ${
                    pending ? "bg-[var(--accent-subtle)]" : ""
                  } ${!done && !pending ? "opacity-45" : ""}`}
                >
                  <span
                    className="relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors duration-300"
                    style={{
                      background: done ? "var(--success)" : "var(--solid-quarternary)",
                      color: done ? "var(--text-on-accent)" : "var(--accent-text)",
                      boxShadow: done ? "none" : "inset 0 0 0 1.5px var(--control-strong-stroke)",
                    }}
                  >
                    {done ? <CheckmarkRegular fontSize={13} className="pop-in" /> : pending ? <Spinner size={14} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block t-body text-fg">{b.label}</span>
                    <span className="block t-caption text-fg-2 truncate">{b.who}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-[11.5px] leading-4 text-fg-2 tabular-nums">{done || pending ? hashes[i] : "—"}</span>
                    <span className="block t-caption text-fg-3 tabular-nums">{done ? `block #${b.block}` : pending ? "mining…" : "queued"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Windows 11 toast */}
      <div
        className={`relative mt-3 ml-auto sm:absolute sm:mt-0 sm:-bottom-16 sm:-right-8 w-[300px] max-w-[85%] rounded-[var(--radius-overlay)] border border-[var(--surface-stroke-flyout)] p-3 shadow-flyout acrylic transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.1,0.9,0.2,1)] ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        role="status"
      >
        <div className="flex items-center gap-2 t-caption text-fg-2">
          <LogoMark size={14} /> ChainIns
        </div>
        <div className="mt-2 flex items-start gap-2.5">
          <ShieldCheckmarkFilled fontSize={20} className="mt-0.5 shrink-0 text-[var(--success)]" aria-hidden />
          <div>
            <p className="t-body-strong text-fg">Hash match</p>
            <p className="t-caption text-fg-2">Documents unchanged since block #1042. Payout recorded on-chain.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
