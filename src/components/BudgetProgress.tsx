import { formatRupiah } from "@/lib/format";
import type { BudgetSummaryRow } from "@/lib/types";

export default function BudgetProgress({ row }: { row: BudgetSummaryRow }) {
  const alloc = Number(row.allocated_amount);
  const spent = Number(row.spent);
  const pct = alloc > 0 ? Math.min((spent / alloc) * 100, 100) : 100;
  const over = spent > alloc;
  const warn = !over && alloc > 0 && spent / alloc > 0.75;
  const barColor = over ? "bg-red-500" : warn ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-base"
            style={{ backgroundColor: `${row.category_color}20` }}
          >
            {row.category_icon}
          </span>
          <span className="font-medium">{row.category_name}</span>
        </div>
        <span
          className={`text-sm font-semibold ${over ? "text-red-600" : "text-gray-700"}`}
        >
          {formatRupiah(Number(row.remaining))}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-gray-500">
        <span>Terpakai {formatRupiah(spent)}</span>
        <span>dari {formatRupiah(alloc)}</span>
      </div>
      {over && (
        <p className="mt-1 text-xs font-medium text-red-600">
          ⚠️ Melebihi budget {formatRupiah(spent - alloc)}
        </p>
      )}
    </div>
  );
}
