"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatFilled, DismissRegular } from "@fluentui/react-icons";
import { CategoryIcon } from "@/components/ui/CategoryGlyph";

// First entry sits closest to the button, so it's the first to appear.
const ACTIONS = [
  { href: "/quote/car", label: "Car insurance", type: "car" },
  { href: "/quote/motor", label: "Motor insurance", type: "motorcycle" },
  { href: "/quote/travel", label: "Travel insurance", type: "travel" },
  { href: "/quote/health", label: "Health insurance", type: "health" },
] as const;

const SHOW_AT = 3500; // ms after load before the button pops in
const BUBBLE_AFTER = 450; // ms after the pop, once the button has landed
const BUBBLE_FOR = 4000; // ms the "Get a free quote?" bubble stays up
const BUBBLE_OUT = 300; // ms, matches the dial-out animation below

/**
 * Floating quote shortcut, modelled on MUI's basic SpeedDial: a round button
 * in the bottom-right corner that fans the four quote products out above it.
 * It opens on mouse hover, and a click keeps it open (or toggles it on touch).
 * Esc, a click elsewhere, or a second click closes it.
 */
export default function QuoteSpeedDial() {
  const [shown, setShown] = useState(false);
  const [bubble, setBubble] = useState<"none" | "in" | "out">("none");
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;
  const rootRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Intro: button at 3.5s, then the bubble for 4s. Counted from when the page
  // opened (performance.now()), not from hydration, which can land a second or
  // more later. Arriving later via client-side navigation counts from arrival.
  useEffect(() => {
    const since = performance.now() < SHOW_AT ? performance.now() : 0;
    const showIn = SHOW_AT - since;
    const timers = [
      setTimeout(() => setShown(true), showIn),
      setTimeout(() => setBubble((b) => (b === "none" ? "in" : b)), showIn + BUBBLE_AFTER),
      setTimeout(() => setBubble((b) => (b === "in" ? "out" : b)), showIn + BUBBLE_AFTER + BUBBLE_FOR),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Opening the dial dismisses the bubble early.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setBubble((b) => (b === "in" ? "out" : b));
  }, [open]);

  // Unmount the bubble once its exit animation has played.
  useEffect(() => {
    if (bubble !== "out") return;
    const id = setTimeout(() => setBubble("none"), BUBBLE_OUT);
    return () => clearTimeout(id);
  }, [bubble]);

  // A click anywhere else closes a pinned dial.
  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPinned(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pinned]);

  function close() {
    setPinned(false);
    setHovered(false);
  }

  function onFabClick() {
    // Hovering already opened it: the click just keeps it open.
    if (open && !pinned) setPinned(true);
    else if (open) close();
    else setPinned(true);
  }

  return (
    <div
      ref={rootRef}
      // The root ignores the pointer so the empty space where the closed actions
      // sit doesn't open the dial; only the button, bubble and open actions do.
      className="pointer-events-none fixed bottom-6 right-6 z-50 sm:bottom-10 sm:right-10 flex flex-col items-center"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          close();
          fabRef.current?.focus();
        }
      }}
    >
      {/* Actions. flex-col-reverse puts the first one nearest the button; pb-3
          (not a margin) keeps the gap to the button inside the hover area. */}
      <ul
        id="quote-dial-actions"
        aria-label="Get a free quote"
        className={`flex flex-col-reverse items-center gap-3 pb-3 ${open ? "pointer-events-auto" : ""}`}
      >
        {ACTIONS.map((a, i) => (
          <li
            key={a.href}
            // Fade in one by one moving up; leave in reverse, a little quicker.
            style={{ transitionDelay: `${open ? i * 70 : (ACTIONS.length - 1 - i) * 40}ms` }}
            className={`transition-[opacity,translate,scale] duration-300 ease-[cubic-bezier(0.1,0.9,0.2,1)] ${
              open ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-75 opacity-0"
            }`}
          >
            <Link
              href={a.href}
              aria-label={a.label}
              aria-hidden={!open}
              tabIndex={open ? 0 : -1}
              className="group relative grid h-12 w-12 place-items-center rounded-full border border-[var(--control-stroke)] bg-[var(--solid-quarternary)] shadow-flyout transition-[scale] duration-200 hover:scale-110"
            >
              <CategoryIcon type={a.type} filled fontSize={22} />
              {/* Label to the left: on hover/focus with a mouse, always on touch screens. */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-[6px] border border-[var(--card-stroke)] bg-[var(--solid-quarternary)] px-2.5 py-1 t-caption font-semibold text-fg opacity-0 shadow-flyout transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              >
                {a.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="relative">
        {bubble !== "none" && (
          <button
            type="button"
            onClick={() => setPinned(true)}
            className="pointer-events-auto absolute right-full top-1/2 mr-4 -translate-y-1/2 origin-bottom-right whitespace-nowrap rounded-2xl border border-[var(--card-stroke)] bg-[var(--solid-quarternary)] px-4 py-2.5 t-body-strong text-fg shadow-flyout"
            style={{
              animation:
                bubble === "in"
                  ? "dial-swing 900ms cubic-bezier(0.22,1,0.36,1) both"
                  : `dial-out ${BUBBLE_OUT}ms ease-in both`,
            }}
          >
            Get a free quote?
            {/* tail pointing at the button */}
            <span
              aria-hidden
              className="absolute -right-[6px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-r border-t border-[var(--card-stroke)] bg-[var(--solid-quarternary)]"
            />
          </button>
        )}

        <button
          ref={fabRef}
          type="button"
          aria-label={open ? "Close quote options" : "Get a free quote"}
          aria-expanded={open}
          aria-controls="quote-dial-actions"
          onClick={onFabClick}
          className={`pointer-events-auto relative grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_12px_28px_-8px_rgba(20,42,115,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[scale] duration-200 hover:scale-105 active:scale-95 ${
            shown ? "" : "invisible"
          }`}
          style={{
            background: "linear-gradient(145deg, #6189f5, #2a4fc4 60%, #1f3c9c)",
            animation: shown ? "dial-pop 560ms ease-out both" : undefined,
          }}
        >
          {/* Message icon turns into a close icon while the dial is open. */}
          <ChatFilled
            fontSize={26}
            aria-hidden
            className={`absolute transition-[opacity,rotate,scale] duration-300 ${open ? "rotate-90 scale-50 opacity-0" : "opacity-100"}`}
          />
          <DismissRegular
            fontSize={24}
            aria-hidden
            className={`absolute transition-[opacity,rotate,scale] duration-300 ${open ? "opacity-100" : "-rotate-90 scale-50 opacity-0"}`}
          />
        </button>
      </div>
    </div>
  );
}
