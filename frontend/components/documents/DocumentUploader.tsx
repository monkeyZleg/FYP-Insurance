"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { sha256File, sha256Files, truncateHash } from "@/lib/hash";
import { safeTimeline } from "@/lib/motion";
import { CheckmarkCircleFilled, CloudArrowUpRegular, DeleteRegular, FingerprintRegular } from "@fluentui/react-icons";
import InfoBar from "@/components/ui/InfoBar";

const ACCEPTED = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];
const MAX_SIZE = 10 * 1024 * 1024;

export interface UploadedFile {
  file: File;
  hash: string;
}

export default function DocumentUploader({
  files,
  onChange,
  combinedHash,
  onCombinedHashChange,
}: {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  combinedHash?: string;
  onCombinedHashChange?: (hash: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [hashing, setHashing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(files.length);

  // Moment C: document upload -> hash confirmation (design spec Part 3.3.C).
  // Runs whenever a new file lands in the list, confirming its hash was recorded.
  useEffect(() => {
    if (files.length > prevCount.current && containerRef.current) {
      const container = containerRef.current;
      const chips = container.querySelectorAll(".file-hash");
      const badges = container.querySelectorAll(".check-badge");
      const lastChip = chips[chips.length - 1];
      const lastBadge = badges[badges.length - 1];
      safeTimeline((tl) => {
        tl.to(".upload-icon", { scale: 1.15, duration: 0.15, ease: "power1.out" })
          .to(".upload-icon", { scale: 1, duration: 0.2 });
        if (lastChip) {
          tl.fromTo(lastChip, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3 });
        }
        if (lastBadge) {
          tl.fromTo(lastBadge, { scale: 0 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }, "-=0.1");
        }
      });
    }
    prevCount.current = files.length;
  }, [files.length]);

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setError("");
      const incoming = Array.from(fileList);

      for (const f of incoming) {
        const ext = "." + f.name.split(".").pop()?.toLowerCase();
        if (!ACCEPTED.includes(ext)) {
          setError(`Unsupported file type: ${f.name}`);
          return;
        }
        if (f.size > MAX_SIZE) {
          setError(`${f.name} exceeds the 10MB limit`);
          return;
        }
      }

      setHashing(true);
      const hashed: UploadedFile[] = await Promise.all(
        incoming.map(async (file) => ({ file, hash: await sha256File(file) }))
      );

      setHashing(false);
      const updated = [...files, ...hashed];
      onChange(updated);

      if (onCombinedHashChange) {
        const combined = await sha256Files(updated.map((u) => u.file));
        onCombinedHashChange(combined);
      }
    },
    [files, onChange, onCombinedHashChange]
  );

  async function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
    if (onCombinedHashChange) {
      const combined = updated.length ? await sha256Files(updated.map((u) => u.file)) : "";
      onCombinedHashChange(combined);
    }
  }

  return (
    <div ref={containerRef}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`group relative flex cursor-pointer flex-col items-center rounded-[var(--radius-overlay)] border-2 border-dashed px-6 py-10 text-center transition-[background-color,border-color] duration-200 ${
          dragOver
            ? "border-[var(--accent-fill)] bg-[var(--accent-subtle)]"
            : "border-[var(--control-stroke-secondary)] bg-[var(--control-alt-fill-secondary)] hover:border-[var(--control-strong-stroke)] hover:bg-[var(--subtle-fill-tertiary)]"
        }`}
      >
        <span
          className={`upload-icon mb-3 grid h-14 w-14 place-items-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.1,0.9,0.2,1)] ${
            dragOver ? "-translate-y-1 scale-110" : "group-hover:-translate-y-0.5"
          }`}
          style={{ background: "var(--accent-subtle-strong)" }}
        >
          <CloudArrowUpRegular fontSize={28} className="text-accent-text" aria-hidden />
        </span>
        <span className="t-body-strong text-fg">{dragOver ? "Drop to add" : "Drag files here"}</span>
        <span className="mt-1 t-body text-fg-2">
          or <span className="link font-semibold">browse your device</span>
        </span>
        <span className="mt-3 t-caption text-fg-3">PDF, JPG, PNG, DOCX — max 10MB per file</span>
        <input type="file" multiple accept={ACCEPTED.join(",")} className="sr-only" onChange={(e) => addFiles(e.target.files)} />
      </label>

      {error && (
        <InfoBar severity="error" className="mt-3" onDismiss={() => setError("")}>
          {error}
        </InfoBar>
      )}

      {(files.length > 0 || hashing) && (
        <ul className="mt-4 divide-y divide-[var(--divider-stroke)] rounded-[var(--radius-overlay)] border border-[var(--card-stroke)] bg-[var(--card-fill)]">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2.5">
              <CheckmarkCircleFilled className="check-badge shrink-0 text-[var(--success)]" fontSize={20} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate t-body-strong text-fg">{f.file.name}</p>
                <p className="file-hash truncate font-mono text-[12px] leading-4 text-fg-2">
                  <span className="text-fg-3">sha256 </span>
                  {truncateHash(f.hash)}
                </p>
              </div>
              <span className="hidden t-caption text-fg-3 tabular-nums sm:inline">{(f.file.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={() => removeFile(i)} className="btn btn-subtle btn-icon" aria-label={`Remove ${f.file.name}`}>
                <DeleteRegular />
              </button>
            </li>
          ))}
          {hashing && (
            <li className="flex items-center gap-3 px-3 py-2.5 t-body text-fg-2">
              <span className="skeleton h-5 w-5 !rounded-full" /> Fingerprinting…
            </li>
          )}
        </ul>
      )}

      {combinedHash && (
        <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-overlay)] border border-[var(--card-stroke)] p-3.5 fade-in" style={{ background: "var(--accent-subtle)" }}>
          <FingerprintRegular fontSize={20} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
          <div className="min-w-0">
            <p className="t-caption font-semibold text-accent-text">Combined SHA-256 document hash</p>
            <code className="mt-0.5 block break-all font-mono text-[12px] leading-[18px] text-fg">{combinedHash}</code>
          </div>
        </div>
      )}
    </div>
  );
}
