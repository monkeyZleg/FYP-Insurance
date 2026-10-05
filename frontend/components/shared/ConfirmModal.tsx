"use client";
import Dialog from "@/components/ui/Dialog";
import Spinner from "@/components/ui/Spinner";

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
    <Dialog
      title={title}
      onClose={onCancel}
      dismissible={!loading}
      footer={
        <>
          <button type="button" onClick={onConfirm} disabled={loading} className={`btn ${danger ? "btn-danger" : "btn-accent"}`}>
            {loading && <Spinner />}
            {loading ? "Waiting for wallet…" : confirmLabel}
          </button>
          <button type="button" onClick={onCancel} disabled={loading} className="btn">
            Cancel
          </button>
        </>
      }
    >
      <p className="text-fg-2">{message}</p>
    </Dialog>
  );
}
