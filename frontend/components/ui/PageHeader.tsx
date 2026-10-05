import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightRegular } from "@fluentui/react-icons";

/** Page title block with an optional WinUI BreadcrumbBar above it. */
export default function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <header className="enter mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 t-body text-fg-2">
            {breadcrumb.map((b, i) => (
              <span key={b.label} className="inline-flex items-center gap-1">
                {b.href ? (
                  <Link href={b.href} className="rounded px-0.5 hover:text-fg transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
                {i < breadcrumb.length - 1 && <ChevronRightRegular fontSize={12} className="text-fg-3" aria-hidden />}
              </span>
            ))}
          </nav>
        )}
        <h1 className="t-title text-fg">{title}</h1>
        {description && <p className="t-body text-fg-2 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
