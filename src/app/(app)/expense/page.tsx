"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BudgetSummaryRow } from "@/lib/types";
import { currentPeriod, formatDate, formatRupiah, periodRange, todayStr } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import MonthPicker from "@/components/MonthPicker";
import AmountInput from "@/components/AmountInput";
import EmptyState from "@/components/EmptyState";

interface ExpenseRow {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  budget_items: {
    category_id: string;
    categories: { name: string; icon: string; color: string } | null;
  } | null;
}

function ExpenseContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState(currentPeriod());
  const [summary, setSummary] = useState<BudgetSummaryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get("add") === "1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(0);
  const [budgetItemId, setBudgetItemId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = periodRange(period);
    const [{ data: sum }, { data: exp }] = await Promise.all([
      supabase
        .from("budget_summary")
        .select("*")
        .eq("period", period)
        .order("category_name"),
      supabase
        .from("expenses")
        .select("*, budget_items(category_id, categories(name, icon, color))")
        .gte("date", from)
        .lt("date", to)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    setSummary((sum as BudgetSummaryRow[]) ?? []);
    setExpenses((exp as unknown as ExpenseRow[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data saat mount/ganti bulan
    load();
  }, [load]);

  async function save() {
    if (amount <= 0 || !budgetItemId) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      budget_item_id: budgetItemId,
      amount,
      date,
      note: note.trim() || null,
    });
    if (error) {
      setError("Gagal menyimpan pengeluaran.");
    } else {
      setAmount(0);
      setNote("");
      setBudgetItemId("");
      setShowForm(false);
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Hapus pengeluaran ini?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    await load();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const selected = summary.find((s) => s.budget_item_id === budgetItemId);
  const willOverspend = selected && amount > Number(selected.remaining);

  return (
    <div>
      <PageHeader
        title="Pengeluaran"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white active:bg-indigo-700"
          >
            + Catat
          </button>
        }
      />

      <div className="space-y-4 px-5 py-4">
        <MonthPicker period={period} onChange={setPeriod} />

        <div className="rounded-2xl bg-rose-600 p-5 text-white shadow-sm">
          <p className="text-sm opacity-80">Total pengeluaran bulan ini</p>
          <p className="mt-1 text-3xl font-bold">{formatRupiah(total)}</p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Memuat...</p>
        ) : expenses.length === 0 ? (
          <EmptyState icon="🧾" message="Belum ada pengeluaran di bulan ini." />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {expenses.map((exp, i) => (
              <div
                key={exp.id}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                  style={{
                    backgroundColor: `${exp.budget_items?.categories?.color ?? "#f43f5e"}20`,
                  }}
                >
                  {exp.budget_items?.categories?.icon ?? "🧾"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {exp.budget_items?.categories?.name ?? "Tanpa kategori"}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {formatDate(exp.date)}
                    {exp.note ? ` · ${exp.note}` : ""}
                  </p>
                </div>
                <span className="font-semibold text-rose-600">
                  -{formatRupiah(Number(exp.amount))}
                </span>
                <button
                  onClick={() => remove(exp.id)}
                  className="px-1 text-gray-300 active:text-red-500"
                  aria-label="Hapus"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setShowForm(false)}>
          <div
            className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold">Catat Pengeluaran</h2>
            {summary.length === 0 ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm text-gray-500">
                  Belum ada budget untuk bulan ini. Buat budget dulu supaya pengeluaran bisa
                  dipotong dari alokasi kategori.
                </p>
                <Link
                  href="/budget"
                  className="inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
                >
                  Buat Budget
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <AmountInput value={amount} onChange={setAmount} autoFocus />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-600">
                    Kategori budget
                  </label>
                  <div className="space-y-2">
                    {summary.map((s) => (
                      <button
                        key={s.budget_item_id}
                        onClick={() => setBudgetItemId(s.budget_item_id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
                          budgetItemId === s.budget_item_id
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-200"
                        }`}
                      >
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${s.category_color}20` }}
                        >
                          {s.category_icon}
                        </span>
                        <span className="flex-1 text-sm font-medium">{s.category_name}</span>
                        <span
                          className={`text-xs font-semibold ${
                            Number(s.remaining) < 0 ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          sisa {formatRupiah(Number(s.remaining))}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {willOverspend && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                    ⚠️ Pengeluaran ini melebihi sisa budget kategori tersebut.
                  </p>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-600">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500"
                  />
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan (opsional)"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  onClick={save}
                  disabled={saving || amount <= 0 || !budgetItemId}
                  className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpensePage() {
  return (
    <Suspense>
      <ExpenseContent />
    </Suspense>
  );
}
