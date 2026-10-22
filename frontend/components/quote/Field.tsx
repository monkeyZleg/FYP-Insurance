"use client";
import { cloneElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode } from "react";

/** Label + control + hint/error. Wires id, aria-invalid and aria-describedby onto the single child control. */
export default function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactElement<Record<string, unknown>>;
}) {
  const id = useId();
  const msg = error || hint;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {cloneElement(children, { id, "aria-invalid": error ? true : undefined, "aria-describedby": msg ? `${id}-msg` : undefined })}
      {msg && (
        <p id={`${id}-msg`} className={error ? "field-error" : "field-hint"}>
          {msg}
        </p>
      )}
    </div>
  );
}

/** Malaysian mobile box: fixed +60 prefix, the rest typed by the user. */
export function PhoneInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex gap-2">
      <span aria-hidden className="textbox !w-auto shrink-0 select-none text-fg-2">
        +60
      </span>
      <input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="12 345 6789" {...props} className="textbox" />
    </div>
  );
}
