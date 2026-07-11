"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Budget, BudgetItem, Category } from "@/lib/types";
import { currentPeriod, formatRupiah, periodRange, shiftPeriod } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import MonthPicker from "@/components/MonthPicker";
import AmountInput from "@/components/AmountInput";
import EmptyState from "@/components/EmptyState";

export default function BudgetPage() {
  const supabase = createClient();
  const [period, setPeriod] = useState(currentPeriod());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<{ categoryId: string; amount: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = periodRange(period);
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
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data saat mount/ganti bulan
    load();
  }, [load]);

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
    if (!user) return;

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

  async function removeItem(item: BudgetItem) {
    if (!confirm(`Hapus budget "${item.categories?.name}"? Pengeluaran yang tercatat di kategori ini pada bulan ini ikut terhapus.`)) return;
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
      alert("Tidak ada budget di bulan sebelumnya.");
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
      }));
    if (toInsert.length > 0) {
      await supabase.from("budget_items").insert(toInsert);
    }
    await load();
    setSaving(false);
  }

  const totalAllocated = items.reduce((s, i) => s + Number(i.allocated_amount), 0);
  const unallocated = totalIncome - totalAllocated;
  const usedCatIds = new Set(items.map((i) => i.category_id));
  const availableCategories = categories.filter((c) => !usedCatIds.has(c.id));

  return (
    <div>
      <PageHeader title="Budget Bulanan" subtitle="Alokasikan dana setelah gajian" />

      <div className="space-y-4 px-5 py-4">
        <MonthPicker period={period} onChange={setPeriod} />

        <div className="rounded-2xl bg-indigo-600 p-5 text-white shadow-sm">
          <div className="flex justify-between text-sm opacity-90">
            <span>Pemasukan</span>
            <span>{formatRupiah(totalIncome)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm opacity-90">
            <span>Dialokasikan</span>
            <span>{formatRupiah(totalAllocated)}</span>
          </div>
          <div className="mt-3 border-t border-white/20 pt-3">
            <p className="text-sm opacity-80">
              {unallocated >= 0 ? "Belum dialokasikan" : "Melebihi pemasukan"}
            </p>
            <p className={`text-2xl font-bold ${unallocated < 0 ? "text-red-200" : ""}`}>
              {formatRupiah(Math.abs(unallocated))}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Memuat...</p>
        ) : (
          <>
            {items.length === 0 && (
              <EmptyState icon="🎯" message="Belum ada budget untuk bulan ini.">
                <button
                  onClick={copyLastMonth}
                  disabled={saving}
                  className="rounded-xl border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 disabled:opacity-50"
                >
                  Salin dari bulan lalu
                </button>
              </EmptyState>
            )}

            {items.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                      style={{ backgroundColor: `${item.categories?.color ?? "#6366f1"}20` }}
                    >
                      {item.categories?.icon ?? "📦"}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{item.categories?.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatRupiah(Number(item.allocated_amount))}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setEditItem({
                          categoryId: item.category_id,
                          amount: Number(item.allocated_amount),
                        })
                      }
                      className="px-2 py-1 text-sm text-indigo-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeItem(item)}
                      className="px-2 py-1 text-sm text-red-500"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}

            {categories.length === 0 ? (
              <p className="text-center text-sm text-gray-500">
                Belum ada kategori pengeluaran.{" "}
                <Link href="/categories" className="font-semibold text-indigo-600">
                  Buat kategori dulu
                </Link>
              </p>
            ) : (
              availableCategories.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-gray-500">
                    Tambah alokasi kategori
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setEditItem({ categoryId: c.id, amount: 0 })}
                        className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 active:border-indigo-500"
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
                className="w-full rounded-xl border border-gray-300 bg-white py-3 text-sm font-medium text-gray-600 disabled:opacity-50"
              >
                Salin alokasi bulan lalu (yang belum ada)
              </button>
            )}
          </>
        )}
      </div>

      {editItem && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setEditItem(null)}>
          <div
            className="w-full rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">
              {categories.find((c) => c.id === editItem.categoryId)?.icon}{" "}
              {categories.find((c) => c.id === editItem.categoryId)?.name}
            </h2>
            <p className="mb-4 text-sm text-gray-500">Berapa alokasi budget bulan ini?</p>
            <div className="space-y-4">
              <AmountInput value={editItem.amount} onChange={(n) => setEditItem({ ...editItem, amount: n })} autoFocus />
              <button
                onClick={saveItem}
                disabled={saving}
                className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Alokasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
