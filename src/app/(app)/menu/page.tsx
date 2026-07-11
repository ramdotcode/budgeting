"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";

const links = [
  { href: "/income", icon: "💸", label: "Pemasukan" },
  { href: "/expense", icon: "🧾", label: "Pengeluaran" },
  { href: "/budget", icon: "🎯", label: "Budget Bulanan" },
  { href: "/categories", icon: "🏷️", label: "Kategori" },
  { href: "/reports", icon: "📊", label: "Laporan & Statistik" },
];

export default function MenuPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="Menu" subtitle={email} />
      <div className="space-y-4 px-5 py-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 ${
                i > 0 ? "border-t border-gray-100" : ""
              }`}
            >
              <span className="text-xl">{l.icon}</span>
              <span className="flex-1 font-medium">{l.label}</span>
              <span className="text-gray-300">›</span>
            </Link>
          ))}
        </div>
        <button
          onClick={logout}
          className="w-full rounded-2xl bg-white py-3.5 font-semibold text-red-600 shadow-sm active:bg-red-50"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
