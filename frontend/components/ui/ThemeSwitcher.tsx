"use client";
import { DesktopRegular, WeatherMoonRegular, WeatherSunnyRegular } from "@fluentui/react-icons";
import { useTheme, type ThemePref } from "@/hooks/useTheme";

const OPTIONS: { value: ThemePref; label: string; Icon: typeof DesktopRegular }[] = [
  { value: "light", label: "Light", Icon: WeatherSunnyRegular },
  { value: "dark", label: "Dark", Icon: WeatherMoonRegular },
  { value: "system", label: "System", Icon: DesktopRegular },
];

function originOf(e: React.MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Icon button that cycles light → dark → system. */
export function ThemeCycleButton({ className = "" }: { className?: string }) {
  const { pref, setTheme } = useTheme();
  const i = OPTIONS.findIndex((o) => o.value === pref);
  const current = OPTIONS[i < 0 ? 2 : i];
  const next = OPTIONS[((i < 0 ? 2 : i) + 1) % OPTIONS.length];
  return (
    <button
      type="button"
      className={`btn btn-subtle btn-icon ${className}`}
      onClick={(e) => setTheme(next.value, originOf(e))}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label}`}
    >
      <current.Icon key={current.value} className="pop-in" />
    </button>
  );
}

/** Three-way segmented theme picker (pane footer). */
export default function ThemeSwitcher() {
  const { pref, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-0.5 rounded-[6px] p-[3px] bg-[var(--control-alt-fill-secondary)] shadow-[inset_0_0_0_1px_var(--control-stroke)]">
      {OPTIONS.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => setTheme(o.value, originOf(e))}
            className={`flex h-7 items-center justify-center gap-1.5 rounded-[var(--radius-control)] t-caption transition-[background-color,color,box-shadow] duration-150 ${
              active
                ? "bg-[var(--solid-quarternary)] text-fg font-semibold shadow-[0_0_0_1px_var(--control-stroke),0_1px_2px_rgba(0,0,0,0.08)]"
                : "text-fg-2 hover:text-fg"
            }`}
          >
            <o.Icon fontSize={14} aria-hidden />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
