"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { BudgetSummaryRow } from "@/lib/types";
import { currentPeriod, formatPeriod, formatRupiah, periodRange } from "@/lib/format";
import BudgetProgress from "@/components/BudgetProgress";
import EmptyState from "@/components/EmptyState";

export default function DashboardPage() {
  const supabase = createClient();
  const period = currentPeriod();
  const [summary, setSummary] = useState<BudgetSummaryRow[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { from, to } = periodRange(period);
    const [{ data: sum }, { data: inc }] = await Promise.all([
      supabase
        .from("budget_summary")
        .select("*")
        .eq("period", period)
        .order("category_name"),
      supabase.from("incomes").select("amount").gte("date", from).lt("date", to),
    ]);
    setSummary((sum as BudgetSummaryRow[]) ?? []);
    setTotalIncome(((inc as { amount: number }[]) ?? []).reduce((s, r) => s + Number(r.amount), 0));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data saat mount/ganti bulan
    load();
  }, [load]);

  const totalAllocated = summary.reduce((s, r) => s + Number(r.allocated_amount), 0);
  const totalSpent = summary.reduce((s, r) => s + Number(r.spent), 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div>
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
        <p className="text-sm text-gray-500 dark:text-gray-400">{formatPeriod(period)}</p>
        <h1 className="text-2xl font-bold">Halo! 👋</h1>
      </header>

      <div className="space-y-4 px-5 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-md shadow-indigo-600/20">
          <p className="text-sm opacity-80">Sisa budget bulan ini</p>
          <p className={`mt-1 text-3xl font-bold ${totalRemaining < 0 ? "text-red-200" : ""}`}>
            {formatRupiah(totalRemaining)}
          </p>
          <div className="mt-4 flex justify-between border-t border-white/20 pt-3 text-sm">
            <div>
              <p className="opacity-70">Pemasukan</p>
              <p className="font-semibold">{formatRupiah(totalIncome)}</p>
            </div>
            <div className="text-right">
              <p className="opacity-70">Terpakai</p>
              <p className="font-semibold">{formatRupiah(totalSpent)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/expense?add=1"
            className="rounded-2xl bg-white dark:bg-gray-900 p-4 text-center shadow-sm active:bg-gray-50 dark:active:bg-gray-800"
          >
            <div className="text-2xl">🧾</div>
            <p className="mt-1 text-sm font-semibold">Catat Pengeluaran</p>
          </Link>
          <Link
            href="/income"
            className="rounded-2xl bg-white dark:bg-gray-900 p-4 text-center shadow-sm active:bg-gray-50 dark:active:bg-gray-800"
          >
            <div className="text-2xl">💸</div>
            <p className="mt-1 text-sm font-semibold">Catat Pemasukan</p>
          </Link>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Budget per kategori</h2>
            <Link href="/budget" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Atur
            </Link>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
          ) : summary.length === 0 ? (
            <EmptyState
              icon="🎯"
              message="Belum ada budget bulan ini. Yuk alokasikan dana setelah gajian!"
            >
              <Link
                href="/budget"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Buat Budget
              </Link>
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {summary.map((row) => (
                <BudgetProgress key={row.budget_item_id} row={row} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
