"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightRegular, ClipboardTaskListLtrRegular } from "@fluentui/react-icons";
import CategoryGlyph from "@/components/ui/CategoryGlyph";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/shared/StatusPill";
import HashDisplay from "@/components/blockchain/HashDisplay";
import type { Claim } from "@/types";

/** Policyholder claim list (WinUI ListView rows — the whole row is the target). */
export default function ClaimsTable({
  claims,
  loading = false,
  empty,
}: {
  claims: Claim[];
  loading?: boolean;
  empty?: React.ReactNode;
}) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="space-y-px p-2" aria-busy>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton m-2 h-12" />
        ))}
      </div>
    );
  }

  if (claims.length === 0) {
    return <>{empty ?? <EmptyState compact icon={ClipboardTaskListLtrRegular} title="No claims found" body="Claims you file will appear here." />}</>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Claim</th>
            <th className="hidden sm:table-cell">Submitted</th>
            <th className="hidden sm:table-cell">Status</th>
            <th className="hidden lg:table-cell">On-chain hash</th>
            <th className="w-10" aria-label="Open" />
          </tr>
        </thead>
        <tbody className="stagger">
          {claims.map((c) => {
            const href = `/dashboard/policyholder/claims/${c.id}`;
            return (
              <tr key={c.id} className="group cursor-pointer" onClick={() => router.push(href)}>
                <td>
                  <div className="flex items-center gap-3">
                    <CategoryGlyph type={c.insurance_type} size={32} />
                    <div className="min-w-0">
                      <Link href={href} onClick={(e) => e.stopPropagation()} className="block truncate t-body-strong text-fg hover:underline">
                        {c.claim_type}
                      </Link>
                      <span className="block font-mono text-[12px] leading-4 text-fg-3">#{c.id.slice(0, 8)}</span>
                      <span className="mt-1.5 block sm:hidden">
                        <StatusPill status={c.status} />
                      </span>
                    </div>
                  </div>
                </td>
                <td className="hidden whitespace-nowrap text-fg-2 tabular-nums sm:table-cell">
                  {new Date(c.submitted_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="hidden sm:table-cell">
                  <StatusPill status={c.status} />
                </td>
                <td className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                  <HashDisplay hash={c.document_hash} />
                </td>
                <td className="text-right">
                  <ChevronRightRegular
                    fontSize={16}
                    className="text-fg-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-fg"
                    aria-hidden
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
