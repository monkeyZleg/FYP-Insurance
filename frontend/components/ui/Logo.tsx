/** BEICVS mark: a shield whose check is drawn as two linked ledger blocks. */
export function LogoMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="beicvs-mark" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7ea0ff" />
          <stop offset="0.5" stopColor="#3a63e0" />
          <stop offset="1" stopColor="#1f3c9c" />
        </linearGradient>
      </defs>
      <path
        d="M16 1.8c.5 0 9.7 3.3 11.3 4.4.9.6 1.2 1.5 1.2 2.7v6.6c0 7.6-5.3 12.6-11.4 14.6a3.4 3.4 0 0 1-2.2 0C8.8 28.1 3.5 23.1 3.5 15.5V8.9c0-1.2.3-2.1 1.2-2.7C6.3 5.1 15.5 1.8 16 1.8Z"
        fill="url(#beicvs-mark)"
      />
      <path d="M16 3.6c.4 0 8 2.8 9.4 3.7.5.3.7.9.7 1.6v2.4c-5.6-1.6-14.6-1.6-20.2 0V8.9c0-.7.2-1.3.7-1.6C8 6.4 15.6 3.6 16 3.6Z" fill="#fff" opacity="0.22" />
      <rect x="8.6" y="14.2" width="6" height="6" rx="1.6" fill="#fff" opacity="0.9" />
      <rect x="17.4" y="10.2" width="6" height="6" rx="1.6" fill="#fff" />
      <path d="M14.6 17.2 17.4 13.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 24, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-semibold tracking-tight text-fg">BEICVS</span>
        {subtitle && <span className="mt-0.5 t-caption text-fg-2">{subtitle}</span>}
      </span>
    </span>
  );
}
