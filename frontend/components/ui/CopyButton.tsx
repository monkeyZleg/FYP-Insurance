"use client";
import { useEffect, useRef, useState } from "react";
import { CheckmarkRegular, CopyRegular } from "@fluentui/react-icons";

/** Subtle icon button; the copy glyph morphs into a checkmark on success. */
export default function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function copy() {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <button type="button" onClick={copy} className="btn btn-subtle btn-icon btn-sm" aria-label={copied ? "Copied" : label} title={copied ? "Copied" : label}>
      <span className="relative grid h-3.5 w-3.5 place-items-center">
        <CopyRegular
          fontSize={14}
          className="absolute transition-all duration-200"
          style={{ opacity: copied ? 0 : 1, transform: copied ? "scale(0.5)" : "none" }}
        />
        <CheckmarkRegular
          fontSize={14}
          className="absolute text-[var(--success)] transition-all duration-200"
          style={{ opacity: copied ? 1 : 0, transform: copied ? "none" : "scale(0.5)" }}
        />
      </span>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
