const ROLE_LABELS: Record<string, string> = {
  policyholder: "Policyholder",
  verifier: "Claim Verifier",
  admin: "Insurance Admin",
  auditor: "Auditor",
};

const ROLE_STYLES: Record<string, string> = {
  policyholder: "bg-indigo-100 text-indigo-700",
  verifier: "bg-blue-100 text-blue-700",
  admin: "bg-slate-200 text-slate-700",
  auditor: "bg-violet-100 text-violet-700",
};

export default function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  return (
    <span
      className={`text-xs font-medium px-3 py-1 rounded-full ${ROLE_STYLES[role] || "bg-gray-100 text-gray-600"}`}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}
