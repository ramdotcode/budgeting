"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, CategoryType } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

const ICONS = ["🍜", "🚌", "🛒", "🧾", "🏦", "🎬", "💼", "🧑‍💻", "🎁", "💊", "📚", "⚽", "✈️", "🏠", "📱", "📦"];
const COLORS = ["#f97316", "#3b82f6", "#ec4899", "#eab308", "#6366f1", "#a855f7", "#22c55e", "#14b8a6", "#ef4444", "#64748b"];

const DEFAULT_CATEGORIES = [
  { name: "Gaji", type: "income", icon: "💼", color: "#22c55e" },
  { name: "Freelance", type: "income", icon: "🧑‍💻", color: "#14b8a6" },
  { name: "Makan & Minum", type: "expense", icon: "🍜", color: "#f97316" },
  { name: "Transport", type: "expense", icon: "🚌", color: "#3b82f6" },
  { name: "Belanja", type: "expense", icon: "🛒", color: "#ec4899" },
  { name: "Tagihan", type: "expense", icon: "🧾", color: "#eab308" },
  { name: "Tabungan", type: "expense", icon: "🏦", color: "#6366f1" },
  { name: "Hiburan", type: "expense", icon: "🎬", color: "#a855f7" },
];

interface FormState {
  id: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

const emptyForm: FormState = {
  id: null,
  name: "",
  type: "expense",
  icon: ICONS[0],
  color: COLORS[0],
};

export default function CategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("type")
      .order("name");
    setCategories((data as Category[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data saat mount/ganti bulan
    load();
  }, [load]);

  async function save() {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      name: form.name.trim(),
      type: form.type,
      icon: form.icon,
      color: form.color,
    };
    const { error } = form.id
      ? await supabase.from("categories").update(payload).eq("id", form.id)
      : await supabase.from("categories").insert({ ...payload, user_id: user.id });

    if (error) {
      setError("Gagal menyimpan kategori. Coba lagi.");
    } else {
      setForm(null);
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Hapus kategori ini? Budget & pengeluaran yang terkait ikut terhapus.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      alert("Gagal menghapus kategori.");
      return;
    }
    await load();
  }

  async function seedDefaults() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("categories")
      .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id })));
    await load();
    setSaving(false);
  }

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div>
      <PageHeader
        title="Kategori"
        subtitle="Kelola kategori pemasukan & pengeluaran"
        action={
          <button
            onClick={() => setForm(emptyForm)}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white active:bg-indigo-700"
          >
            + Baru
          </button>
        }
      />

      <div className="space-y-6 px-5 py-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Memuat...</p>
        ) : categories.length === 0 ? (
          <EmptyState icon="🏷️" message="Belum ada kategori.">
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Pakai kategori default
            </button>
          </EmptyState>
        ) : (
          <>
            <CategorySection
              title="Pemasukan"
              items={incomeCategories}
              onEdit={(c) => setForm({ id: c.id, name: c.name, type: c.type, icon: c.icon, color: c.color })}
              onDelete={remove}
            />
            <CategorySection
              title="Pengeluaran"
              items={expenseCategories}
              onEdit={(c) => setForm({ id: c.id, name: c.name, type: c.type, icon: c.icon, color: c.color })}
              onDelete={remove}
            />
          </>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setForm(null)}>
          <div
            className="w-full rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold">
              {form.id ? "Edit Kategori" : "Kategori Baru"}
            </h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium ${
                      form.type === t
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {t === "expense" ? "Pengeluaran" : "Pemasukan"}
                  </button>
                ))}
              </div>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama kategori"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
              />
              <div className="flex flex-wrap gap-2">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setForm({ ...form, icon: ic })}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                      form.icon === ic ? "bg-indigo-100 ring-2 ring-indigo-500" : "bg-gray-100"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    onClick={() => setForm({ ...form, color: col })}
                    className={`h-8 w-8 rounded-full ${form.color === col ? "ring-2 ring-offset-2 ring-gray-800" : ""}`}
                    style={{ backgroundColor: col }}
                    aria-label={`Warna ${col}`}
                  />
                ))}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
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

function CategorySection({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: Category[];
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-500">{title}</h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {items.map((c, i) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: `${c.color}20` }}
            >
              {c.icon}
            </span>
            <span className="flex-1 font-medium">{c.name}</span>
            <button onClick={() => onEdit(c)} className="px-2 py-1 text-sm text-indigo-600">
              Edit
            </button>
            <button onClick={() => onDelete(c.id)} className="px-2 py-1 text-sm text-red-500">
              Hapus
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
