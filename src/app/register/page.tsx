"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Kalau email confirmation aktif, belum ada session — user harus cek email dulu
    if (!data.session) {
      setInfo("Cek email kamu untuk konfirmasi akun, lalu login.");
      setLoading(false);
      return;
    }
    // Seed kategori default supaya user baru langsung bisa mulai
    if (data.user) {
      await supabase
        .from("categories")
        .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: data.user!.id })));
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="text-4xl">💰</div>
        <h1 className="mt-2 text-2xl font-bold">Daftar Akun</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Mulai atur budget bulananmu</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900"
            placeholder="kamu@email.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900"
            placeholder="Minimal 6 karakter"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {info && <p className="text-sm text-green-600 dark:text-green-400">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white active:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Mendaftar..." : "Daftar"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400">
          Masuk
        </Link>
      </p>
    </main>
  );
}
