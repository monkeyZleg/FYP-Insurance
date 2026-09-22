"use client";
import type { InsuranceConfig } from "@/constants/insurance";

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
  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border-2 p-5 transition-colors ${config.bg} ${
        selected ? config.border : "border-transparent"
      } ${onSelect ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl">{config.icon}</span>
        {selected && <span className={`text-xs font-medium ${config.text}`}>Selected</span>}
      </div>
      <h3 className="font-semibold text-lg text-ink font-display">{config.label}</h3>
      <p className="text-xs text-gray-400 mb-2">{config.labelZh}</p>
      <p className="text-sm text-gray-600 mb-4">{config.description}</p>
      {onFileClaim && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFileClaim();
          }}
          className={`text-sm font-medium px-4 py-2 rounded-lg w-full text-white`}
          style={{ backgroundColor: config.color }}
        >
          File {config.label} Claim
        </button>
      )}
    </div>
  );
}
