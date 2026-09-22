const ROLE_LABELS: Record<string, string> = {
  policyholder: "Policyholder",
  verifier: "Claim Verifier",
  admin: "Insurance Admin",
  auditor: "Auditor",
};

const ROLE_STYLES: Record<string, string> = {
  policyholder: "bg-[#EEF0FC] text-[#3D4FE0]",
  verifier: "bg-[#EEF0FC] text-[#3D4FE0]",
  admin: "bg-[#E1E6F5] text-ink",
  auditor: "bg-[#EEF0FC] text-[#3D4FE0]",
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
