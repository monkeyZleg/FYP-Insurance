import { CheckmarkCircleFilled, CircleRegular } from "@fluentui/react-icons";
import type { InstalmentItem } from "@/types";

export default function InstalmentSchedule({
  instalments,
  premium,
}: {
  instalments: InstalmentItem[];
  premium: number;
}) {
  if (instalments.length === 0) return null;
  const per = Math.round((premium / instalments.length) * 100) / 100;
  return (
    <div className="card overflow-hidden">
      <div className="table-wrap">
        <table className="table tabular-nums">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Due date</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {instalments.map((i) => {
              const amount =
                i.index === instalments.length ? Math.round((premium - per * (instalments.length - 1)) * 100) / 100 : per;
              return (
                <tr key={i.index}>
                  <td className="text-fg-2">{i.index}</td>
                  <td>{i.dueDate || <span className="text-fg-3">Month {i.index}</span>}</td>
                  <td className="text-right">RM {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="text-right">
                    {i.paid ? (
                      <span className="inline-flex items-center gap-1.5 text-[var(--success)] font-semibold">
                        <CheckmarkCircleFilled fontSize={16} aria-hidden /> Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-fg-2">
                        <CircleRegular fontSize={16} aria-hidden /> Due
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
