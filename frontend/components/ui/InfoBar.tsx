import type { ReactNode } from "react";
import {
  CheckmarkCircleFilled,
  DismissRegular,
  ErrorCircleFilled,
  InfoFilled,
  WarningFilled,
} from "@fluentui/react-icons";

type Severity = "info" | "success" | "warning" | "error";

const STYLES: Record<Severity, { bg: string; fg: string; Icon: typeof InfoFilled }> = {
  info: { bg: "var(--attention-bg)", fg: "var(--attention)", Icon: InfoFilled },
  success: { bg: "var(--success-bg)", fg: "var(--success)", Icon: CheckmarkCircleFilled },
  warning: { bg: "var(--caution-bg)", fg: "var(--caution)", Icon: WarningFilled },
  error: { bg: "var(--critical-bg)", fg: "var(--critical)", Icon: ErrorCircleFilled },
};

/** WinUI InfoBar: inline, non-modal status message with a severity glyph. */
export default function InfoBar({
  severity = "info",
  title,
  children,
  action,
  onDismiss,
  className = "",
}: {
  severity?: Severity;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const s = STYLES[severity];
  return (
    <div
      role={severity === "error" ? "alert" : "status"}
      className={`fade-in flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--card-stroke)] px-4 py-3 ${className}`}
      style={{ background: s.bg }}
    >
      <s.Icon className="mt-0.5 shrink-0" fontSize={16} style={{ color: s.fg }} aria-hidden />
      <div className="min-w-0 flex-1 t-body text-fg">
        {title && <span className="font-semibold mr-2">{title}</span>}
        {children && <span className="text-fg">{children}</span>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="btn btn-subtle btn-icon btn-sm -my-0.5 -mr-1" aria-label="Dismiss">
          <DismissRegular />
        </button>
      )}
    </div>
  );
}
