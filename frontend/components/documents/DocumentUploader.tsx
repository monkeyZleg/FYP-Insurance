"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { sha256File, sha256Files, truncateHash } from "@/lib/hash";
import { safeTimeline } from "@/lib/motion";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(files.length);

  // Moment C: document upload -> hash confirmation (design spec Part 3.3.C).
  // Runs whenever a new file lands in the list, confirming its hash was recorded.
  useEffect(() => {
    if (files.length > prevCount.current && containerRef.current) {
      const container = containerRef.current;
      const chips = container.querySelectorAll(".hash-chip");
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

      const hashed: UploadedFile[] = await Promise.all(
        incoming.map(async (file) => ({ file, hash: await sha256File(file) }))
      );

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
      <div
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
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? "border-chain-indigo bg-[#EEF0FC]" : "border-border"
        }`}
      >
        <div className="upload-icon inline-block text-3xl mb-2">📎</div>
        <p className="text-sm text-gray-500 mb-2">
          Drag and drop files here, or
        </p>
        <label className="inline-block bg-chain-indigo text-white text-sm font-medium px-4 py-2 rounded-lg cursor-pointer hover:bg-[#2F3FC0] transition-colors">
          Browse Files
          <input
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        <p className="text-xs text-gray-400 mt-3">
          PDF, JPG, PNG, DOCX — max 10MB per file
        </p>
      </div>

      {error && <p className="text-sm text-failure mt-2">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between bg-cloud rounded-lg px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="check-badge text-[#17B890] text-sm shrink-0">✓</span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{f.file.name}</p>
                  <p className="hash-chip text-xs font-mono text-gray-400 truncate">
                    {truncateHash(f.hash)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="text-failure hover:opacity-70 text-xs ml-3 shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {combinedHash && (
        <div className="mt-4 bg-[#EEF0FC] border border-[#3D4FE0]/25 rounded-lg p-3">
          <p className="text-xs text-chain-indigo font-medium mb-1">
            Combined SHA-256 Document Hash
          </p>
          <code className="text-xs font-mono break-all text-ink">
            {combinedHash}
          </code>
        </div>
      )}
    </div>
  );
}
