export const ROLE_LABELS: Record<string, string> = {
  policyholder: "Policyholder",
  verifier: "Claim Verifier",
  admin: "Insurance Admin",
  auditor: "Auditor",
};

export default function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  return <span className="badge badge-outline">{ROLE_LABELS[role] || role}</span>;
}
