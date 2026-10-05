"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * WinUI ContentDialog: smoke layer, dialog scales in from 105%, content on the
 * layer fill, command row on the secondary solid fill.
 */
export default function Dialog({
  title,
  children,
  footer,
  onClose,
  dismissible = true,
  width = 448,
  as = "div",
  onSubmit,
}: {
  title: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  dismissible?: boolean;
  width?: number;
  as?: "div" | "form";
  onSubmit?: (e: React.FormEvent) => void;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>("input, select, textarea, button:not([disabled])");
    first?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) closeRef.current();
      if (e.key !== "Tab" || !node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])")
      );
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [dismissible]);

  const Body = as;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4" style={{ animation: "smoke-in 167ms linear both" }}>
      <div className="absolute inset-0 bg-[var(--smoke)]" onClick={dismissible ? onClose : undefined} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full overflow-hidden rounded-[var(--radius-overlay)] border border-[var(--surface-stroke-flyout)] shadow-dialog bg-[var(--solid-base)]"
        style={{ maxWidth: width, animation: "dialog-in 250ms cubic-bezier(0.1,0.9,0.2,1) both" }}
      >
        <Body onSubmit={onSubmit} className="contents">
          <div className="px-6 pt-6 pb-6 bg-[var(--layer-fill-alt)] dark:bg-[var(--solid-quarternary)]">
            <h2 id={titleId} className="t-subtitle text-fg mb-3">
              {title}
            </h2>
            <div className="t-body text-fg">{children}</div>
          </div>
          <div className="flex gap-2 border-t border-[var(--card-stroke)] px-6 py-6 [&>*]:flex-1">{footer}</div>
        </Body>
      </div>
    </div>
  );
}
