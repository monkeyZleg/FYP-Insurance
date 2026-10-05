"use client";
import { ArrowRightRegular, CheckmarkCircleFilled } from "@fluentui/react-icons";
import type { InsuranceConfig } from "@/constants/insurance";
import CategoryGlyph from "@/components/ui/CategoryGlyph";

export default function InsuranceTypeCard({
  config,
  selected,
  onSelect,
  onFileClaim,
}: {
  config: InsuranceConfig;
  selected?: boolean;
  onSelect?: () => void;
  onFileClaim?: () => void;
}) {
  const body = (
    <>
      <div className="mb-4 flex items-start justify-between">
        <CategoryGlyph type={config.id} variant="solid" size={44} />
        {onSelect && (
          <span
            aria-hidden
            className={`grid h-5 w-5 place-items-center rounded-full transition-all duration-200 ${
              selected ? "scale-100 text-accent-text" : "scale-90 shadow-[inset_0_0_0_1px_var(--control-strong-stroke)]"
            }`}
          >
            {selected && <CheckmarkCircleFilled fontSize={20} className="pop-in" />}
          </span>
        )}
      </div>
      <h3 className="t-body-large font-semibold text-fg">
        {config.label} <span className="t-caption font-normal text-fg-3">{config.labelZh}</span>
      </h3>
      <p className="t-body text-fg-2 mt-1">{config.description}</p>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={!!selected}
        onClick={onSelect}
        className={`card card-interactive reveal block w-full p-5 text-left ${
          selected ? "!bg-[var(--accent-subtle)] shadow-[inset_0_0_0_1.5px_var(--accent-fill)]" : ""
        }`}
      >
        {body}
      </button>
    );
  }

  return (
    <div className="card reveal group flex h-full flex-col p-5">
      {body}
      {onFileClaim && (
        <div className="mt-auto pt-4">
          <button type="button" onClick={onFileClaim} className="btn btn-subtle nudge -ml-3 text-accent-text">
            File a {config.label.toLowerCase()} claim
            <ArrowRightRegular />
          </button>
        </div>
      )}
    </div>
  );
}
