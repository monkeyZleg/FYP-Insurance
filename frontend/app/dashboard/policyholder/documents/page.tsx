"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetchAuth } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import HashDisplay from "@/components/blockchain/HashDisplay";
import type { Claim, Document as ClaimDocument } from "@/types";

interface DocRow extends ClaimDocument {
  claim?: Claim;
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
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Documents</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3">File Name</th>
              <th className="px-4 py-3">Claim</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3">SHA-256 Hash</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{d.file_name}</td>
                <td className="px-4 py-3">
                  {d.claim && (
                    <Link
                      href={`/dashboard/policyholder/claims/${d.claim.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {d.claim.claim_type}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{new Date(d.uploaded_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <HashDisplay hash={d.file_hash} />
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-400 py-12">
                  No documents uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
