import type { InstalmentItem } from "@/types";

export default function InstalmentSchedule({ instalments }: { instalments: InstalmentItem[] }) {
  if (instalments.length === 0) return null;
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
          {instalments.map((i) => (
            <tr key={i.index} className="border-b last:border-0">
              <td className="px-3 py-2">{i.index}</td>
              <td className="px-3 py-2">{i.dueDate}</td>
              <td className="px-3 py-2">RM {i.amount.toLocaleString()}</td>
              <td className="px-3 py-2">
                {i.paid ? (
                  <span className="text-green-600 font-medium">Paid</span>
                ) : (
                  <span className="text-gray-400">Due</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
