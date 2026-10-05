import type { ComponentType, ReactNode } from "react";

export default function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon?: ComponentType<{ className?: string; fontSize?: number }>;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`fade-in flex flex-col items-center text-center ${compact ? "py-10 px-6" : "py-16 px-6"}`}>
      {Icon && (
        <div className="relative mb-4 grid place-items-center w-14 h-14 rounded-full" style={{ background: "var(--accent-subtle)" }}>
          <Icon className="text-accent-text" fontSize={26} />
        </div>
      )}
      <p className="t-body-strong text-fg">{title}</p>
      {body && <p className="t-body text-fg-2 mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
