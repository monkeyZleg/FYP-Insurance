const TINTS = ["#2a4fc4", "#0e7a6f", "#8a3fd1", "#b4541a", "#2f7bd8", "#a3317a"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Fluent PersonPicture: initials on a hashed tint. */
export default function Persona({ name, size = 32 }: { name: string; size?: number }) {
  const hash = Array.from(name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, background: TINTS[hash % TINTS.length] }}
    >
      {initials(name)}
    </span>
  );
}
