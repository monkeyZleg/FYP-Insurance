"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DocumentMultipleRegular, DocumentPdfRegular, DocumentRegular, ImageRegular } from "@fluentui/react-icons";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import HashDisplay from "@/components/blockchain/HashDisplay";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import type { Claim, Document as ClaimDocument } from "@/types";

interface DocRow extends ClaimDocument {
  claim?: Claim;
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  const Icon = ext === "pdf" ? DocumentPdfRegular : ["jpg", "jpeg", "png"].includes(ext || "") ? ImageRegular : DocumentRegular;
  const color = ext === "pdf" ? "#c42b1c" : ["jpg", "jpeg", "png"].includes(ext || "") ? "var(--cat-health)" : "var(--accent-fill)";
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px]" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      <Icon fontSize={18} style={{ color }} aria-hidden />
    </span>
  );
}

export default function MyDocumentsPage() {
  const { token } = useRole();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { claims } = await apiFetchAuth("/api/claims/my", {}, token);
        const results = await Promise.all(
          (claims || []).map((c: Claim) =>
            apiFetchAuth(`/api/documents/${c.id}`, {}, token)
              .then((d) => (d.documents || []).map((doc: ClaimDocument) => ({ ...doc, claim: c })))
              .catch(() => [])
          )
        );
        setRows(results.flat());
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div>
      <PageHeader title="My documents" description="Supporting files across all your claims. Each is identified by its SHA-256 fingerprint." />
      <div className="card enter enter-2 overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={DocumentMultipleRegular} title="No documents uploaded yet" body="Files you attach to a claim will be listed here." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Claim</th>
                  <th className="hidden sm:table-cell">Uploaded</th>
                  <th className="hidden md:table-cell">SHA-256 hash</th>
                </tr>
              </thead>
              <tbody className="stagger">
                {rows.map((d) => (
                  <tr key={`${d.claim?.id}-${d.id}`}>
                    <td>
                      <span className="flex items-center gap-3">
                        <FileIcon name={d.file_name} />
                        <span className="t-body-strong text-fg break-all">{d.file_name}</span>
                      </span>
                    </td>
                    <td>
                      {d.claim && (
                        <Link href={`/dashboard/policyholder/claims/${d.claim.id}`} className="link">
                          {d.claim.claim_type}
                        </Link>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap text-fg-2 tabular-nums sm:table-cell">{new Date(d.uploaded_at).toLocaleDateString()}</td>
                    <td className="hidden md:table-cell">
                      <HashDisplay hash={d.file_hash} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
