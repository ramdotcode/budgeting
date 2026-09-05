"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Budget, BudgetItem, Category } from "@/lib/types";
import { currentPeriod, daysInPeriod, formatRupiah, periodRange, shiftPeriod } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import PageHeader from "@/components/PageHeader";
import MonthPicker from "@/components/MonthPicker";
import AmountInput from "@/components/AmountInput";
import EmptyState from "@/components/EmptyState";

export default function BudgetPage() {
  const supabase = createClient();
  const { startDay, ready } = useSettings();
  const [period, setPeriod] = useState(() => currentPeriod());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<{ categoryId: string; amount: number } | null>(null);
  const [splitItem, setSplitItem] = useState<{ item: BudgetItem; days: number } | null>(null);

  const load = useCallback(async () => {
    if (!ready) return; // tunggu setelan periode terbaca supaya rentangnya tidak salah
    setLoading(true);
    const { from, to } = periodRange(period, startDay);
    const [{ data: bud }, { data: cats }, { data: inc }] = await Promise.all([
      supabase.from("budgets").select("*").eq("period", period).maybeSingle(),
      supabase.from("categories").select("*").eq("type", "expense").order("name"),
      supabase.from("incomes").select("amount").gte("date", from).lt("date", to),
    ]);
    setBudget((bud as Budget) ?? null);
    setCategories((cats as Category[]) ?? []);
    setTotalIncome(((inc as { amount: number }[]) ?? []).reduce((s, r) => s + Number(r.amount), 0));

    if (bud) {
      const { data: bi } = await supabase
        .from("budget_items")
        .select("*, categories(name, icon, color)")
        .eq("budget_id", (bud as Budget).id);
      setItems((bi as BudgetItem[]) ?? []);
    } else {
      setItems([]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, startDay, ready]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data saat mount/ganti periode
    load();
  }, [load]);

  useEffect(() => {
    // setelan periode baru selesai dibaca -> lompat ke periode yang sedang berjalan
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeriod(currentPeriod(startDay));
  }, [startDay]);

  async function ensureBudget(): Promise<Budget | null> {
    if (budget) return budget;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("budgets")
      .insert({ user_id: user.id, period })
      .select()
      .single();
    if (error) return null;
    setBudget(data as Budget);
    return data as Budget;
  }

  async function saveItem() {
    if (!editItem || editItem.amount < 0) return;
    setSaving(true);
    const bud = await ensureBudget();
    if (!bud) {
      setSaving(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const existing = items.find((i) => i.category_id === editItem.categoryId);
    if (existing) {
      await supabase
        .from("budget_items")
        .update({ allocated_amount: editItem.amount })
        .eq("id", existing.id);
    } else {
      await supabase.from("budget_items").insert({
        user_id: user.id,
        budget_id: bud.id,
        category_id: editItem.categoryId,
        allocated_amount: editItem.amount,
      });
    }
    setEditItem(null);
    await load();
    setSaving(false);
  }

  async function saveSplit(days: number | null) {
    if (!splitItem) return;
    setSaving(true);
    const { error } = await supabase
      .from("budget_items")
      .update({ split_days: days })
      .eq("id", splitItem.item.id);
    if (error) {
      alert(
        "Gagal menyimpan pembagian hari. Pastikan migration 00002_split_days.sql sudah dijalankan di Supabase SQL Editor."
      );
    } else {
      setSplitItem(null);
      await load();
    }
    setSaving(false);
  }

  async function removeItem(item: BudgetItem) {
    if (!confirm(`Hapus budget "${item.categories?.name}"? Pengeluaran yang tercatat di kategori ini pada periode ini ikut terhapus.`)) return;
    await supabase.from("budget_items").delete().eq("id", item.id);
    await load();
  }

  async function copyLastMonth() {
    setSaving(true);
    const prev = shiftPeriod(period, -1);
    const { data: prevBudget } = await supabase
      .from("budgets")
      .select("*")
      .eq("period", prev)
      .maybeSingle();
    if (!prevBudget) {
      alert("Tidak ada budget di periode sebelumnya.");
      setSaving(false);
      return;
    }
    const { data: prevItems } = await supabase
      .from("budget_items")
      .select("*")
      .eq("budget_id", (prevBudget as Budget).id);

    const bud = await ensureBudget();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!bud || !user || !prevItems) {
      setSaving(false);
      return;
    }
    const existingCatIds = new Set(items.map((i) => i.category_id));
    const toInsert = (prevItems as BudgetItem[])
      .filter((i) => !existingCatIds.has(i.category_id))
      .map((i) => ({
        user_id: user.id,
        budget_id: bud.id,
        category_id: i.category_id,
        allocated_amount: i.allocated_amount,
        // sertakan hanya jika ada, supaya tetap jalan sebelum migration 00002 diterapkan
        ...(i.split_days != null ? { split_days: i.split_days } : {}),
      }));
    if (toInsert.length > 0) {
      await supabase.from("budget_items").insert(toInsert);
    }
    await load();
    setSaving(false);
  }

  const daysInMonth = daysInPeriod(period, startDay);
  const totalAllocated = items.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const unallocated = totalIncome - totalAllocated;
  const usedCatIds = new Set(items.map((i) => i.category_id));
  const availableCategories = categories.filter((c) => !usedCatIds.has(c.id));

  return (
    <div>
      <PageHeader title="Budget Bulanan" subtitle="Alokasikan dana setelah gajian" />

      <div className="space-y-4 px-5 py-4">
        <MonthPicker period={period} onChange={setPeriod} />

        <div className="rounded-2xl bg-gradient-to-br from-lime-200 to-lime-300 p-5 text-lime-950 shadow-sm shadow-lime-600/20 dark:from-lime-950 dark:to-green-950 dark:text-lime-100">
          <div className="flex justify-between text-sm opacity-90">
            <span>Pemasukan</span>
            <span>{formatRupiah(totalIncome)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm opacity-90">
            <span>Dialokasikan</span>
            <span>{formatRupiah(totalAllocated)}</span>
          </div>
          <div className="mt-3 border-t border-lime-950/15 dark:border-lime-100/20 pt-3">
            <p className="text-sm opacity-80">
              {unallocated >= 0 ? "Belum dialokasikan" : "Melebihi pemasukan"}
            </p>
            <p className={`text-2xl font-bold ${unallocated < 0 ? "text-red-700 dark:text-red-300" : ""}`}>
              {formatRupiah(Math.abs(unallocated))}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
        ) : (
          <>
            {items.length === 0 && (
              <EmptyState icon="🎯" message="Belum ada budget untuk periode ini.">
                <button
                  onClick={copyLastMonth}
                  disabled={saving}
                  className="rounded-xl border border-lime-600 dark:border-lime-500 px-4 py-2 text-sm font-semibold text-lime-700 dark:text-lime-400 disabled:opacity-50"
                >
                  Salin dari periode lalu
                </button>
              </EmptyState>
            )}

            {items.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-sm">
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                      style={{ backgroundColor: `${item.categories?.color ?? "#6366f1"}20` }}
                    >
                      {item.categories?.icon ?? "📦"}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{item.categories?.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatRupiah(Number(item.allocated_amount))}
                      </p>
                      {item.split_days ? (
                        <p className="text-xs font-medium text-sky-600 dark:text-sky-400">
                          📅 ±{formatRupiah(Math.floor(Number(item.allocated_amount) / item.split_days))}
                          /hari · {item.split_days} hari
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() =>
                        setSplitItem({ item, days: item.split_days ?? daysInMonth })
                      }
                      className="px-2 py-1 text-sm text-sky-600 dark:text-sky-400"
                    >
                      /hari
                    </button>
                    <button
                      onClick={() =>
                        setEditItem({
                          categoryId: item.category_id,
                          amount: Number(item.allocated_amount),
                        })
                      }
                      className="px-2 py-1 text-sm text-lime-700 dark:text-lime-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeItem(item)}
                      className="px-2 py-1 text-sm text-red-500 dark:text-red-400"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}

            {categories.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Belum ada kategori pengeluaran.{" "}
                <Link href="/categories" className="font-semibold text-lime-700 dark:text-lime-400">
                  Buat kategori dulu
                </Link>
              </p>
            ) : (
              availableCategories.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Tambah alokasi kategori
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setEditItem({ categoryId: c.id, amount: 0 })}
                        className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 active:border-lime-500"
                      >
                        <span>{c.icon}</span> {c.name} +
                      </button>
                    ))}
                  </div>
                </section>
              )
            )}

            {items.length > 0 && (
              <button
                onClick={copyLastMonth}
                disabled={saving}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 disabled:opacity-50"
              >
                Salin alokasi periode lalu (yang belum ada)
              </button>
            )}
          </>
        )}
      </div>

      {editItem && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setEditItem(null)}>
          <div
            className="w-full rounded-t-3xl bg-white dark:bg-gray-900 p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">
              {categories.find((c) => c.id === editItem.categoryId)?.icon}{" "}
              {categories.find((c) => c.id === editItem.categoryId)?.name}
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Berapa alokasi budget periode ini?</p>
            <div className="space-y-4">
              <AmountInput value={editItem.amount} onChange={(n) => setEditItem({ ...editItem, amount: n })} autoFocus />
              <button
                onClick={saveItem}
                disabled={saving}
                className="w-full rounded-xl bg-lime-400 py-3 font-semibold text-lime-950 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Alokasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {splitItem && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setSplitItem(null)}>
          <div
            className="w-full rounded-t-3xl bg-white dark:bg-gray-900 p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">
              {splitItem.item.categories?.icon} Bagi per Hari — {splitItem.item.categories?.name}
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Alokasi {formatRupiah(Number(splitItem.item.allocated_amount))} dibagi berapa hari?
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={366}
                  value={splitItem.days || ""}
                  onChange={(e) =>
                    setSplitItem({ ...splitItem, days: parseInt(e.target.value, 10) || 0 })
                  }
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-lime-500 dark:border-gray-700 dark:bg-gray-900"
                />
                <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">hari</span>
              </div>
              <div className="flex gap-2">
                {[7, 14, daysInMonth].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSplitItem({ ...splitItem, days: d })}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      splitItem.days === d
                        ? "border-lime-500 bg-lime-100 font-semibold text-lime-800 dark:bg-lime-950 dark:text-lime-300"
                        : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {d === daysInMonth ? `${d} (1 periode)` : d} hari
                  </button>
                ))}
              </div>
              {splitItem.days >= 1 && splitItem.days <= 366 && (
                <div className="rounded-xl bg-sky-50 px-4 py-3 text-center dark:bg-sky-950">
                  <p className="text-sm text-sky-700 dark:text-sky-300">Jatah per hari</p>
                  <p className="text-2xl font-bold text-sky-800 dark:text-sky-200">
                    ±{formatRupiah(Math.floor(Number(splitItem.item.allocated_amount) / splitItem.days))}
                  </p>
                </div>
              )}
              <button
                onClick={() => saveSplit(splitItem.days)}
                disabled={saving || splitItem.days < 1 || splitItem.days > 366}
                className="w-full rounded-xl bg-lime-400 py-3 font-semibold text-lime-950 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Pembagian"}
              </button>
              {splitItem.item.split_days != null && (
                <button
                  onClick={() => saveSplit(null)}
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Hapus pembagian hari
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
