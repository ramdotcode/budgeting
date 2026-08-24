"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BudgetSummaryRow } from "@/lib/types";
import {
  currentPeriod,
  formatPeriod,
  formatRupiah,
  periodRange,
  shiftPeriod,
} from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import MonthPicker from "@/components/MonthPicker";
import EmptyState from "@/components/EmptyState";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TREND_MONTHS = 6;

function shortRupiah(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

export default function ReportsPage() {
  const supabase = createClient();
  const [period, setPeriod] = useState(currentPeriod());
  const [summary, setSummary] = useState<BudgetSummaryRow[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [trend, setTrend] = useState<
    { month: string; pemasukan: number; pengeluaran: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = periodRange(period);
    const trendStart = shiftPeriod(period, -(TREND_MONTHS - 1));

    const [{ data: sum }, { data: inc }, { data: allInc }, { data: allExp }] =
      await Promise.all([
        supabase
          .from("budget_summary")
          .select("*")
          .eq("period", period)
          .order("spent", { ascending: false }),
        supabase.from("incomes").select("amount").gte("date", from).lt("date", to),
        supabase
          .from("incomes")
          .select("amount, date")
          .gte("date", trendStart)
          .lt("date", to),
        supabase
          .from("expenses")
          .select("amount, date")
          .gte("date", trendStart)
          .lt("date", to),
      ]);

    setSummary((sum as BudgetSummaryRow[]) ?? []);
    setTotalIncome(
      ((inc as { amount: number }[]) ?? []).reduce((s, r) => s + Number(r.amount), 0)
    );

    // Kelompokkan pemasukan/pengeluaran per bulan untuk chart tren
    const months: string[] = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i--) months.push(shiftPeriod(period, -i));
    const byMonth = new Map(
      months.map((m) => [m.slice(0, 7), { pemasukan: 0, pengeluaran: 0 }])
    );
    for (const r of (allInc as { amount: number; date: string }[]) ?? []) {
      const key = r.date.slice(0, 7);
      const row = byMonth.get(key);
      if (row) row.pemasukan += Number(r.amount);
    }
    for (const r of (allExp as { amount: number; date: string }[]) ?? []) {
      const key = r.date.slice(0, 7);
      const row = byMonth.get(key);
      if (row) row.pengeluaran += Number(r.amount);
    }
    setTrend(
      months.map((m) => ({
        month: formatPeriod(m).split(" ")[0].slice(0, 3),
        ...byMonth.get(m.slice(0, 7))!,
      }))
    );
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data saat mount/ganti bulan
    load();
  }, [load]);

  const totalSpent = summary.reduce((s, r) => s + Number(r.spent), 0);
  const totalAllocated = summary.reduce((s, r) => s + Number(r.allocated_amount), 0);
  const pieData = summary
    .filter((r) => Number(r.spent) > 0)
    .map((r) => ({
      name: r.category_name,
      value: Number(r.spent),
      color: r.category_color,
    }));
  const barData = summary.map((r) => ({
    name: r.category_name.length > 8 ? r.category_name.slice(0, 8) + "…" : r.category_name,
    Budget: Number(r.allocated_amount),
    Realisasi: Number(r.spent),
  }));

  return (
    <div>
      <PageHeader title="Laporan" subtitle="Statistik keuanganmu" />

      <div className="space-y-4 px-5 py-4">
        <MonthPicker period={period} onChange={setPeriod} />

        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Pemasukan" value={totalIncome} color="text-green-600 dark:text-green-400" />
          <StatCard label="Pengeluaran" value={totalSpent} color="text-rose-600 dark:text-rose-400" />
          <StatCard label="Selisih" value={totalIncome - totalSpent} color="text-lime-700 dark:text-lime-400" />
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
        ) : (
          <>
            <section className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                Pengeluaran per kategori
              </h2>
              {pieData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  Belum ada pengeluaran bulan ini.
                </p>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {pieData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {pieData.map((d) => (
                      <li key={d.name} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="flex-1">{d.name}</span>
                        <span className="font-medium">{formatRupiah(d.value)}</span>
                        <span className="w-12 text-right text-xs text-gray-400 dark:text-gray-500">
                          {totalSpent > 0 ? Math.round((d.value / totalSpent) * 100) : 0}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                Budget vs Realisasi
              </h2>
              {barData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                  Belum ada budget bulan ini.
                </p>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8888885a" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                        <YAxis tickFormatter={shortRupiah} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Budget" fill="#d9f99d" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Realisasi" fill="#65a30d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                    Total budget {formatRupiah(totalAllocated)} · terpakai{" "}
                    {formatRupiah(totalSpent)}
                  </p>
                </>
              )}
            </section>

            <section className="rounded-2xl bg-white dark:bg-gray-900 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                Tren {TREND_MONTHS} bulan terakhir
              </h2>
              {trend.every((t) => t.pemasukan === 0 && t.pengeluaran === 0) ? (
                <EmptyState icon="📈" message="Belum ada data untuk tren." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8888885a" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={shortRupiah} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="pemasukan" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="pengeluaran" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 text-center shadow-sm">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`mt-0.5 text-xs font-bold ${color}`}>{formatRupiah(value)}</p>
    </div>
  );
}
