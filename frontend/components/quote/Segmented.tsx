"use client";
import { useId, type ReactNode } from "react";

/** Pill toggle built on real radio inputs, so arrow keys and form semantics come for free. */
export default function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-[var(--subtle-fill-secondary)] p-1">
      {options.map((o) => (
        <label key={o.value} className="relative cursor-pointer">
          <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} className="peer sr-only" />
          <span className="grid min-h-9 place-items-center rounded-full px-3 py-1 text-center t-body text-fg-2 transition-colors hover:text-fg peer-checked:bg-[var(--accent-fill)] peer-checked:font-semibold peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent-fill)]">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
