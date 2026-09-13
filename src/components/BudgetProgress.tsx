import { formatRupiah } from "@/lib/format";
import type { BudgetSummaryRow } from "@/lib/types";
import Icon from "@/components/Icon";

export default function BudgetProgress({
  row,
  daily,
}: {
  row: BudgetSummaryRow;
  /** jatah per hari untuk kategori "/hari": sisa budget dibagi `days`; onEdit membuat barisnya bisa diketuk */
  daily?: { days: number; label: string; onEdit?: () => void };
}) {
  const alloc = Number(row.allocated_amount);
  const spent = Number(row.spent);
  const remaining = Number(row.remaining);
  const pct = alloc > 0 ? Math.min((spent / alloc) * 100, 100) : spent > 0 ? 100 : 0;
  const over = spent > alloc;
  const warn = !over && alloc > 0 && spent / alloc > 0.75;
  const barColor = over ? "bg-red-500" : warn ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: `${row.category_color}20` }}
          >
            {row.category_icon}
          </span>
          <span className="font-medium">{row.category_name}</span>
        </div>
        <span
          className={`text-sm font-semibold ${over ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200"}`}
        >
          {formatRupiah(remaining)}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Terpakai {formatRupiah(spent)}</span>
        <span>dari {formatRupiah(alloc)}</span>
      </div>
      {daily && daily.days > 0 && remaining > 0 && (
        daily.onEdit ? (
          <button
            onClick={daily.onEdit}
            className="mt-1 flex items-center gap-1 text-left text-xs font-medium text-sky-600 active:opacity-70 dark:text-sky-400"
          >
            <span>
              📅 ±{formatRupiah(Math.floor(remaining / daily.days))}/hari · {daily.label}
            </span>
            <Icon name="pencil" className="h-3.5 w-3.5 shrink-0" />
          </button>
        ) : (
          <p className="mt-1 text-xs font-medium text-sky-600 dark:text-sky-400">
            📅 ±{formatRupiah(Math.floor(remaining / daily.days))}/hari · {daily.label}
          </p>
        )
      )}
      {over && (
        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
          ⚠️ Melebihi budget {formatRupiah(spent - alloc)}
        </p>
      )}
    </div>
  );
}
