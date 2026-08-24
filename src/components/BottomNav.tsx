"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/budget", label: "Budget", icon: "🎯" },
  { href: "/add", label: "", icon: "＋", isFab: true },
  { href: "/reports", label: "Laporan", icon: "📊" },
  { href: "/menu", label: "Menu", icon: "☰" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {items.map((item) =>
          item.isFab ? (
            <Link
              key={item.href}
              href={item.href}
              aria-label="Tambah transaksi"
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl text-white shadow-lg active:bg-indigo-700"
            >
              {item.icon}
            </Link>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs ${
                pathname === item.href
                  ? "font-semibold text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
