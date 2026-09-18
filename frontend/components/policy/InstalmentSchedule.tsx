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
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-gray-500 border-b">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Due Date</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {instalments.map((i) => {
            const amount = i.index === instalments.length ? Math.round((premium - per * (instalments.length - 1)) * 100) / 100 : per;
            return (
              <tr key={i.index} className="border-b last:border-0">
                <td className="px-3 py-2">{i.index}</td>
                <td className="px-3 py-2">{i.dueDate}</td>
                <td className="px-3 py-2">RM {amount.toLocaleString()}</td>
                <td className="px-3 py-2">
                  {i.paid ? (
                    <span className="text-green-600 font-medium">Paid</span>
                  ) : (
                    <span className="text-gray-400">Due</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
