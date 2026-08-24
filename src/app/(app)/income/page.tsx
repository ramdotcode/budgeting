"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, Income } from "@/lib/types";
import {
  clampDateToPeriod,
  currentPeriod,
  formatDate,
  formatRupiah,
  lastDayOfPeriod,
  periodRange,
  todayStr,
} from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import MonthPicker from "@/components/MonthPicker";
import AmountInput from "@/components/AmountInput";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";

export default function IncomePage() {
  const supabase = createClient();
  const [period, setPeriod] = useState(currentPeriod());
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = periodRange(period);
    const [{ data: inc }, { data: cats }] = await Promise.all([
      supabase
        .from("incomes")
        .select("*, categories(name, icon, color)")
        .gte("date", from)
        .lt("date", to)
        .order("date", { ascending: false }),
      supabase.from("categories").select("*").eq("type", "income").order("name"),
    ]);
    setIncomes((inc as Income[]) ?? []);
    setCategories((cats as Category[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data saat mount/ganti bulan
    load();
  }, [load]);

  useEffect(() => {
    // pemasukan tampil per bulan berdasarkan tanggal, jadi jaga tanggal di periode terpilih
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(clampDateToPeriod(todayStr(), period));
  }, [period]);

  async function save() {
    if (amount <= 0) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("incomes").insert({
      user_id: user.id,
      amount,
      category_id: categoryId || null,
      date,
      note: note.trim() || null,
    });
    if (error) {
      setError("Gagal menyimpan pemasukan.");
    } else {
      setAmount(0);
      setNote("");
      setShowForm(false);
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Hapus pemasukan ini?")) return;
    await supabase.from("incomes").delete().eq("id", id);
    await load();
  }

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <PageHeader
        title="Pemasukan"
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

        <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 p-5 text-white shadow-sm shadow-green-600/20">
          <p className="text-sm opacity-80">Total pemasukan bulan ini</p>
          <p className="mt-1 text-3xl font-bold">{formatRupiah(total)}</p>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
        ) : incomes.length === 0 ? (
          <EmptyState icon="💸" message="Belum ada pemasukan di bulan ini." />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-sm">
            {incomes.map((inc, i) => (
              <div
                key={inc.id}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                  style={{ backgroundColor: `${inc.categories?.color ?? "#22c55e"}20` }}
                >
                  {inc.categories?.icon ?? "💰"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {inc.categories?.name ?? "Tanpa kategori"}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(inc.date)}
                    {inc.note ? ` · ${inc.note}` : ""}
                  </p>
                </div>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  +{formatRupiah(Number(inc.amount))}
                </span>
                <button
                  onClick={() => remove(inc.id)}
                  className="px-1 text-gray-300 active:text-red-500 dark:text-gray-600"
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
            className="w-full rounded-t-3xl bg-white dark:bg-gray-900 p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold">Catat Pemasukan</h2>
            <div className="space-y-4">
              <AmountInput value={amount} onChange={setAmount} autoFocus />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">Sumber</label>
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Belum ada kategori pemasukan.{" "}
                    <Link href="/categories" className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Buat dulu
                    </Link>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCategoryId(categoryId === c.id ? "" : c.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm ${
                          categoryId === c.id
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-medium text-indigo-700 dark:text-indigo-300"
                            : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <span>{c.icon}</span> {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-300">Tanggal</label>
                <input
                  type="date"
                  value={date}
                  min={period}
                  max={lastDayOfPeriod(period)}
                  onChange={(e) => setDate(clampDateToPeriod(e.target.value, period))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan (opsional)"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900"
              />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button
                onClick={save}
                disabled={saving || amount <= 0}
                className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
