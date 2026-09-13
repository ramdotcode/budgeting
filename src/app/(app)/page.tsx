"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { BudgetSummaryRow } from "@/lib/types";
import {
  currentPeriod,
  daysLeftInPeriod,
  formatPeriod,
  formatRupiah,
  formatRupiahShort,
  periodRange,
  shiftPeriod,
} from "@/lib/format";
import { useSettings } from "@/lib/settings";
import BudgetProgress from "@/components/BudgetProgress";
import FrogMascot from "@/components/FrogMascot";
import Icon, { type IconName } from "@/components/Icon";
import PeriodStartSetting from "@/components/PeriodStartSetting";

// pilihan di dropdown periode: periode berjalan + 11 periode sebelumnya
const PERIOD_CHOICES = 12;

interface Totals {
  income: number;
  allocated: number;
  spent: number;
  transactions: number;
}

const NO_TOTALS: Totals = { income: 0, allocated: 0, spent: 0, transactions: 0 };

type MoneyRow = { amount: number };
type AllocRow = { allocated_amount: number; spent: number };

function toTotals(alloc: AllocRow[] | null, incomes: MoneyRow[] | null, expenseCount: number | null): Totals {
  const sum = <T,>(rows: T[] | null, pick: (r: T) => number) =>
    (rows ?? []).reduce((s, r) => s + pick(r), 0);
  return {
    income: sum(incomes, (r) => Number(r.amount)),
    allocated: sum(alloc, (r) => Number(r.allocated_amount)),
    spent: sum(alloc, (r) => Number(r.spent)),
    transactions: (incomes?.length ?? 0) + (expenseCount ?? 0),
  };
}

export default function DashboardPage() {
  const supabase = createClient();
  const { startDay, ready } = useSettings();
  const [period, setPeriod] = useState(() => currentPeriod());
  const [summary, setSummary] = useState<BudgetSummaryRow[]>([]);
  // budget item yang di-set "/hari" di halaman Budget — hanya ini yang dapat jatah per hari
  const [dailyItemIds, setDailyItemIds] = useState<Set<string>>(new Set());
  const [totals, setTotals] = useState<Totals>(NO_TOTALS);
  const [prevTotals, setPrevTotals] = useState<Totals>(NO_TOTALS);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const nowPeriod = currentPeriod(startDay);
  const isCurrent = period === nowPeriod;
  const daysLeft = isCurrent ? daysLeftInPeriod(period, startDay) : 0;
  const periodChoices = Array.from({ length: PERIOD_CHOICES }, (_, i) => shiftPeriod(nowPeriod, -i));
  const status = isCurrent
    ? `sisa ${daysLeft} hari`
    : period < nowPeriod
      ? "periode selesai"
      : "belum mulai";

  const load = useCallback(async () => {
    if (!ready) return; // tunggu setelan periode terbaca supaya rentangnya tidak salah
    setLoading(true);
    const prev = shiftPeriod(period, -1);
    const cur = periodRange(period, startDay);
    const old = periodRange(prev, startDay);
    const [sum, inc, exp, prevSum, prevInc, prevExp] = await Promise.all([
      supabase.from("budget_summary").select("*").eq("period", period).order("category_name"),
      supabase.from("incomes").select("amount").gte("date", cur.from).lt("date", cur.to),
      supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .gte("date", cur.from)
        .lt("date", cur.to),
      supabase.from("budget_summary").select("allocated_amount, spent").eq("period", prev),
      supabase.from("incomes").select("amount").gte("date", old.from).lt("date", old.to),
      supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .gte("date", old.from)
        .lt("date", old.to),
    ]);
    const rows = (sum.data as BudgetSummaryRow[]) ?? [];
    // split_days tidak ada di view budget_summary, jadi ambil dari budget_items
    const { data: daily } = rows.length
      ? await supabase
          .from("budget_items")
          .select("id")
          .in("id", rows.map((r) => r.budget_item_id))
          .not("split_days", "is", null)
      : { data: [] };
    setSummary(rows);
    setDailyItemIds(new Set(((daily as { id: string }[]) ?? []).map((d) => d.id)));
    setTotals(toTotals(rows, inc.data as MoneyRow[] | null, exp.count));
    setPrevTotals(toTotals(prevSum.data as AllocRow[] | null, prevInc.data as MoneyRow[] | null, prevExp.count));
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

  const remaining = totals.allocated - totals.spent;
  const prevRemaining = prevTotals.allocated - prevTotals.spent;

  return (
    <div>
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatPeriod(period, startDay)} · {status}
            </p>
            <h1 className="mt-1 text-3xl font-bold">Halo! 👋</h1>
            <p className="mt-2 max-w-[13rem] text-sm leading-snug text-gray-600 dark:text-gray-300">
              Yuk, kelola keuanganmu hari ini biar impian makin dekat! 💚
            </p>
          </div>
          <Link
            href="/menu"
            aria-label="Akun & menu"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:active:bg-gray-800"
          >
            <Icon name="user" className="h-5 w-5" />
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-lime-400 ring-2 ring-gray-50 dark:ring-gray-950" />
          </Link>
        </div>
      </header>

      <div className="space-y-6 px-5 pb-6 pt-4">
        {/* Kartu sisa budget */}
        <div className="relative">
          <FrogMascot className="pointer-events-none absolute -top-[74px] right-4 z-10 w-[120px]" />
          <div className="rounded-3xl bg-lime-300 p-5 text-lime-950 dark:bg-lime-800 dark:text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500 text-white dark:bg-lime-600">
                  <Icon name="wallet" className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium leading-tight">
                  Sisa budget periode ini{" "}
                  <button
                    onClick={() => setShowInfo((v) => !v)}
                    aria-label="Apa itu sisa budget?"
                    aria-expanded={showInfo}
                    className="inline-flex translate-y-0.5 opacity-70 active:opacity-100"
                  >
                    <Icon name="info" className="h-4 w-4" />
                  </button>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <PeriodStartSetting
                  trigger={(open) => (
                    <button
                      onClick={open}
                      className="flex items-center gap-1.5 rounded-full bg-lime-950/10 px-3 py-1.5 text-xs font-medium active:bg-lime-950/20 dark:bg-black/25 dark:active:bg-black/40"
                    >
                      Periode <Icon name="calendar" className="h-3.5 w-3.5" />
                    </button>
                  )}
                />
                <label className="relative">
                  <span className="sr-only">Pilih periode</span>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="appearance-none rounded-full bg-lime-950/10 py-1.5 pl-3 pr-7 text-xs font-medium outline-none dark:bg-black/25"
                  >
                    {periodChoices.map((p) => (
                      <option key={p} value={p}>
                        {formatPeriod(p, startDay)}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="chevronDown"
                    className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  />
                </label>
              </div>
            </div>

            <p
              className={`mt-2 text-4xl font-bold tracking-tight ${
                remaining < 0 ? "text-red-700 dark:text-red-300" : ""
              }`}
            >
              {formatRupiah(remaining)}
            </p>
            {showInfo && (
              <p className="mt-2 text-xs leading-snug opacity-80">
                Sisa = total alokasi budget dikurangi yang sudah terpakai di periode ini.
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-lime-950/15 pt-4 dark:border-white/15">
              <CardStat icon="arrowDown" tone="bg-green-500" label="Pemasukan" value={totals.income} />
              <CardStat icon="arrowUp" tone="bg-rose-500" label="Terpakai" value={totals.spent} />
            </div>
          </div>
        </div>

        {/* Aksi cepat */}
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            href="/expense?add=1"
            icon="filePlus"
            title="Catat Pengeluaran"
            description="Tambah pengeluaran baru dengan mudah"
          />
          <QuickAction
            href="/income"
            icon="walletPlus"
            title="Catat Pemasukan"
            description="Catat pemasukanmu di sini"
          />
        </div>

        {/* Budget per kategori */}
        <section>
          <SectionTitle
            icon={<Icon name="barChart" className="h-5 w-5" strokeWidth={3} />}
            title="Budget per kategori"
            action={
              <Link
                href="/budget"
                className="flex items-center gap-0.5 text-sm font-semibold text-lime-600 dark:text-lime-400"
              >
                Atur <Icon name="chevronRight" className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            }
          />
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Memuat...</p>
          ) : summary.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-lime-100 px-6 py-8 text-center dark:bg-lime-950">
              <span className="text-5xl">🎯</span>
              <p className="mt-3 font-bold">Belum ada budget periode ini.</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Yuk alokasikan dana setelah gajian!
              </p>
              <Link
                href="/budget"
                className="mt-5 flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 font-bold text-lime-950 active:bg-lime-500"
              >
                <Icon name="plusCircle" className="h-5 w-5" /> Buat Budget
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.map((row) => (
                <BudgetProgress
                  key={row.budget_item_id}
                  row={row}
                  daysLeft={isCurrent && dailyItemIds.has(row.budget_item_id) ? daysLeft : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {/* Ringkasan cepat */}
        <section>
          <SectionTitle
            icon={<Icon name="sparkles" className="h-5 w-5" filled strokeWidth={1.5} />}
            title="Ringkasan Cepat"
            action={
              <Link
                href="/reports"
                className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold active:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:active:bg-gray-800"
              >
                Lihat Detail <Icon name="chevronRight" className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>
            }
          />
          <div className="grid grid-cols-4 gap-2">
            <SummaryTile
              href="/income"
              icon="wallet"
              tone="bg-green-500"
              label="Total Pemasukan"
              value={totals.income}
              prev={prevTotals.income}
            />
            <SummaryTile
              href="/expense"
              icon="arrowUp"
              tone="bg-rose-500"
              label="Total Pengeluaran"
              value={totals.spent}
              prev={prevTotals.spent}
              lowerIsBetter
            />
            <SummaryTile
              href="/budget"
              icon="target"
              tone="bg-violet-500"
              label="Sisa Budget"
              value={remaining}
              prev={prevRemaining}
            />
            <SummaryTile
              href="/expense"
              icon="calendar"
              tone="bg-sky-500"
              label="Jumlah Transaksi"
              value={totals.transactions}
              prev={prevTotals.transactions}
              isMoney={false}
            />
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
            ▲▼ dibanding periode sebelumnya
          </p>
        </section>
      </div>
    </div>
  );
}

function CardStat({
  icon,
  tone,
  label,
  value,
}: {
  icon: IconName;
  tone: string;
  label: string;
  value: number;
}) {
  const text = formatRupiah(value);
  // huruf mengecil untuk nominal panjang supaya jutaan tidak terpotong di kolom setengah kartu
  const size = text.length <= 10 ? "text-lg" : text.length <= 12 ? "text-[15px]" : "text-sm";
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${tone}`}>
        <Icon name={icon} className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <p className="text-sm opacity-80">{label}</p>
        <p className={`truncate font-bold ${size}`}>{text}</p>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="text-lime-600 dark:text-lime-400">{icon}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col rounded-3xl border border-gray-200 bg-white p-3.5 active:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:active:bg-gray-800"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500 text-white">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-bold leading-tight tracking-tight">{title}</p>
      <p className="mt-1 pr-9 text-xs leading-snug text-gray-500 dark:text-gray-400">{description}</p>
      <span className="absolute bottom-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-lime-500 text-white">
        <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2.5} />
      </span>
    </Link>
  );
}

// perubahan dibanding periode sebelumnya, mis. "▲ 12%"
function compare(value: number, prev: number, lowerIsBetter: boolean) {
  const muted = "text-gray-400 dark:text-gray-500";
  if (prev === 0) return { text: value === 0 ? "–" : "baru", className: muted };
  const pct = Math.round(((value - prev) / Math.abs(prev)) * 100);
  if (pct === 0) return { text: "0%", className: muted };
  const better = lowerIsBetter ? pct < 0 : pct > 0;
  const shown = Math.abs(pct) > 999 ? ">999%" : `${Math.abs(pct)}%`;
  return {
    text: `${pct > 0 ? "▲" : "▼"} ${shown}`,
    className: better ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400",
  };
}

function SummaryTile({
  href,
  icon,
  tone,
  label,
  value,
  prev,
  isMoney = true,
  lowerIsBetter = false,
}: {
  href: string;
  icon: IconName;
  tone: string;
  label: string;
  value: number;
  prev: number;
  isMoney?: boolean;
  lowerIsBetter?: boolean;
}) {
  const delta = compare(value, prev, lowerIsBetter);
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-2.5 active:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:active:bg-gray-800"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${tone}`}>
        <Icon name={icon} className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <p className="mt-2 h-7 text-[11px] leading-tight text-gray-600 dark:text-gray-300">{label}</p>
      <p className="mt-1 truncate text-[13px] font-bold">{isMoney ? formatRupiahShort(value) : value}</p>
      <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px]">
        <span className={`truncate font-medium ${delta.className}`}>{delta.text}</span>
        <Icon name="chevronRight" className="h-3 w-3 shrink-0 text-gray-400" strokeWidth={2.5} />
      </div>
    </Link>
  );
}
