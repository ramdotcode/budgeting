"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/budget", label: "Budget", icon: "target" },
  { href: "/reports", label: "Laporan", icon: "barChart" },
  { href: "/menu", label: "Menu", icon: "menu" },
];

function NavItem({ href, label, icon, active }: (typeof items)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative flex flex-1 flex-col items-center gap-1 pb-3 pt-2.5 text-xs ${
        active ? "font-semibold text-lime-600 dark:text-lime-400" : "text-gray-500 dark:text-gray-400"
      }`}
    >
      <Icon
        name={icon}
        className="h-6 w-6"
        strokeWidth={icon === "barChart" ? 3 : 2}
        filled={active && icon === "home"}
      />
      {label}
      {active && <span className="absolute bottom-1 h-1 w-6 rounded-full bg-lime-500 dark:bg-lime-400" />}
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [home, budget, reports, menu] = items;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-end rounded-t-3xl border-t border-gray-200 bg-white px-2 dark:border-gray-800 dark:bg-gray-900">
        <NavItem {...home} active={pathname === home.href} />
        <NavItem {...budget} active={pathname === budget.href} />
        <div className="flex flex-1 justify-center">
          <Link
            href="/add"
            aria-label="Tambah transaksi"
            className="-mt-7 mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-lime-500 text-white shadow-lg ring-4 ring-gray-50 active:bg-lime-600 dark:ring-gray-950"
          >
            <Icon name="plus" className="h-8 w-8" strokeWidth={2.75} />
          </Link>
        </div>
        <NavItem {...reports} active={pathname === reports.href} />
        <NavItem {...menu} active={pathname === menu.href} />
      </div>
    </nav>
  );
}
