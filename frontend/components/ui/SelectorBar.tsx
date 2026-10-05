"use client";
import { useCallback, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

export interface SelectorItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ComponentType<{ className?: string; fontSize?: number }>;
  count?: number;
}

/**
 * WinUI SelectorBar / Segmented control. The selection indicator is a single
 * element that glides between items rather than jumping, like NavigationView.
 *  - "underline": text items with an accent pill beneath the active one (SelectorBar)
 *  - "segmented": items inside a recessed track, the active one raised (Segmented)
 */
export default function SelectorBar<T extends string>({
  items,
  value,
  onChange,
  variant = "underline",
  label,
  size = "md",
  className = "",
}: {
  items: SelectorItem<T>[];
  value: T;
  onChange: (v: T) => void;
  variant?: "underline" | "segmented";
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const el = track.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
    if (!el) return setBox(null);
    setBox({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value]);

  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [measure, items.length]);

  // keep the active item in view on narrow screens
  useLayoutEffect(() => {
    const el = trackRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = items.findIndex((it) => it.value === value);
    const next = items[(i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    onChange(next.value);
    trackRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next.value)}"]`)?.focus();
  }

  const segmented = variant === "segmented";
  const h = size === "sm" ? "h-7" : "h-8";

  return (
    <div className={`max-w-full overflow-x-auto scrollbar-none ${className}`}>
      <div
        ref={trackRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`relative inline-flex items-center ${
          segmented ? "gap-0.5 rounded-[6px] p-[3px] bg-[var(--control-alt-fill-secondary)] shadow-[inset_0_0_0_1px_var(--control-stroke)]" : "gap-1"
        }`}
      >
        {box && (
          <span
            aria-hidden
            className={
              segmented
                ? "absolute top-[3px] bottom-[3px] left-0 rounded-[var(--radius-control)] bg-[var(--solid-quarternary)] dark:bg-[var(--control-fill-secondary)] shadow-[0_0_0_1px_var(--control-stroke),0_1px_2px_rgba(0,0,0,0.08)]"
                : "absolute bottom-0 left-0 h-[3px] rounded-full bg-[var(--accent-fill)]"
            }
            style={{
              transform: `translateX(${segmented ? box.x : box.x + box.w / 2 - 8}px)`,
              width: segmented ? box.w : 16,
              transition: "transform 333ms cubic-bezier(0.55,0.55,0,1), width 333ms cubic-bezier(0.55,0.55,0,1)",
            }}
          />
        )}
        {items.map((it) => {
          const active = it.value === value;
          return (
            <button
              key={it.value}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              data-value={it.value}
              onClick={() => onChange(it.value)}
              className={`relative z-[1] inline-flex ${h} shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] px-3 t-body transition-colors duration-100 ${
                segmented
                  ? active
                    ? "text-fg font-semibold"
                    : "text-fg-2 hover:text-fg"
                  : active
                    ? "text-fg font-semibold"
                    : "text-fg-2 hover:bg-[var(--subtle-fill-secondary)] hover:text-fg"
              } ${segmented ? "" : "mb-[5px]"}`}
            >
              {it.icon && <it.icon fontSize={16} className={active ? "text-accent-text" : ""} />}
              <span className="grid">
                {/* reserve bold width so the label doesn't shift when it becomes active */}
                <span className="col-start-1 row-start-1 invisible font-semibold" aria-hidden>
                  {it.label}
                </span>
                <span className="col-start-1 row-start-1">{it.label}</span>
              </span>
              {typeof it.count === "number" && (
                <span
                  className={`ml-0.5 min-w-5 rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums ${
                    active ? "bg-[var(--accent-fill)] text-[var(--text-on-accent)]" : "bg-[var(--subtle-fill-secondary)] text-fg-2"
                  }`}
                >
                  {it.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
