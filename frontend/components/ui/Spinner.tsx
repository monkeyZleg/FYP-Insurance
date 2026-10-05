/** WinUI ProgressRing (indeterminate). Inherits `currentColor`. */
export default function Spinner({ size = 16, className = "", label }: { size?: number; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={`progress-ring ${className}`}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="8" cy="8" r="6.5" strokeWidth="1.5" pathLength="100" />
    </svg>
  );
}
