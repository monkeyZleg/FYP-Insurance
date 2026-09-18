"use client";
import { useCallback, useState } from "react";
import { sha256File, sha256Files, truncateHash } from "@/lib/hash";

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
    <div>
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
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300"
        }`}
      >
        <p className="text-sm text-gray-500 mb-2">
          Drag and drop files here, or
        </p>
        <label className="inline-block bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700">
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

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{f.file.name}</p>
                <p className="text-xs font-mono text-gray-400 truncate">
                  {truncateHash(f.hash)}
                </p>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="text-red-500 hover:text-red-700 text-xs ml-3 shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {combinedHash && (
        <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-xs text-indigo-700 font-medium mb-1">
            Combined SHA-256 Document Hash
          </p>
          <code className="text-xs font-mono break-all text-indigo-900">
            {combinedHash}
          </code>
        </div>
      )}
    </div>
  );
}
