"use client";

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-border">
        <h3 className="text-lg font-bold mb-2 text-ink">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2 rounded-lg font-medium text-white disabled:opacity-50 ${
              danger ? "bg-failure hover:bg-[#C93338]" : "bg-chain-indigo hover:bg-[#2F3FC0]"
            }`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-border rounded-lg hover:bg-cloud"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
