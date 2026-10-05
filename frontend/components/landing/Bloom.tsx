/**
 * Abstract "bloom" — a nod to the Windows 11 wallpaper, drawn as ribbons of
 * light fanning out from a point. Pure SVG, rotates very slowly.
 */
export default function Bloom({ className = "", spin = true }: { className?: string; spin?: boolean }) {
  const outer = Array.from({ length: 7 }, (_, i) => i * (360 / 7));
  const inner = Array.from({ length: 7 }, (_, i) => i * (360 / 7) + 360 / 14);
  return (
    <svg viewBox="-220 -220 440 440" className={className} aria-hidden>
      <defs>
        <linearGradient id="bloom-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#142a73" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#3a63e0" />
          <stop offset="1" stopColor="#b9ccff" />
        </linearGradient>
        <linearGradient id="bloom-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1f3c9c" />
          <stop offset="0.6" stopColor="#6189f5" />
          <stop offset="1" stopColor="#e6ecff" />
        </linearGradient>
        <radialGradient id="bloom-core">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#93b1ff" stopOpacity="0" />
        </radialGradient>
        <filter id="bloom-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      <g style={spin ? { animation: "bloom-spin 120s linear infinite", transformOrigin: "0 0" } : undefined} filter="url(#bloom-soft)">
        {outer.map((r) => (
          <path
            key={`o${r}`}
            d="M0 0 C 40 -70, 150 -96, 206 -26 C 150 -4, 70 18, 0 0 Z"
            fill="url(#bloom-a)"
            opacity="0.78"
            transform={`rotate(${r})`}
          />
        ))}
        {inner.map((r) => (
          <path
            key={`i${r}`}
            d="M0 0 C 30 -46, 104 -64, 140 -16 C 100 -2, 46 12, 0 0 Z"
            fill="url(#bloom-b)"
            opacity="0.85"
            transform={`rotate(${r})`}
          />
        ))}
        <circle r="54" fill="url(#bloom-core)" />
      </g>
    </svg>
  );
}
