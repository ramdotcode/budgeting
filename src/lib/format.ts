export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// "1500000" / "1.500.000" -> 1500000
export function parseAmount(input: string): number {
  const digits = input.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

// tampilkan angka di input dengan pemisah ribuan: 1500000 -> "1.500.000"
export function formatAmountInput(input: string | number): string {
  const n = typeof input === "number" ? input : parseAmount(input);
  return n ? n.toLocaleString("id-ID") : "";
}

// ===== Periode =====
//
// Sebuah periode diwakili "anchor": tanggal 1 dari bulan tempat periode itu MULAI
// (bentuknya tetap "2026-07-01" supaya kolom budgets.period tidak perlu berubah).
//
// startDay menentukan hari reset periode:
//   startDay = 1  -> periode 2026-07-01 berarti 1 Jul s/d 31 Jul (ikut kalender)
//   startDay = 25 -> periode 2026-07-01 berarti 25 Jul s/d 24 Agu (ikut tanggal gajian)
//
// Dibatasi 1-28 supaya tanggal mulainya selalu ada di tiap bulan.

export const DEFAULT_PERIOD_START_DAY = 1;
export const MIN_PERIOD_START_DAY = 1;
export const MAX_PERIOD_START_DAY = 28;

export function normalizePeriodStartDay(day: unknown): number {
  const n = Number(day);
  if (!Number.isInteger(n) || n < MIN_PERIOD_START_DAY || n > MAX_PERIOD_START_DAY) {
    return DEFAULT_PERIOD_START_DAY;
  }
  return n;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Date -> "2026-07-01" (anchor bulan tsb)
export function toPeriod(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  return toPeriod(new Date(y, m - 1 + delta, 1));
}

// anchor periode yang memuat tanggal tsb.
// startDay 25: "2026-07-24" masih periode Juni, "2026-07-25" sudah periode Juli.
export function periodOfDate(dateStr: string, startDay = DEFAULT_PERIOD_START_DAY): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toPeriod(new Date(y, m - 1 + (d >= startDay ? 0 : -1), 1));
}

export function currentPeriod(startDay = DEFAULT_PERIOD_START_DAY): string {
  return periodOfDate(todayStr(), startDay);
}

// tanggal pertama periode: anchor "2026-07-01" + startDay 25 -> "2026-07-25"
export function periodStart(period: string, startDay = DEFAULT_PERIOD_START_DAY): string {
  const [y, m] = period.split("-").map(Number);
  return ymd(new Date(y, m - 1, startDay));
}

// tanggal terakhir periode = sehari sebelum periode berikutnya mulai
// startDay 1  + "2026-07-01" -> "2026-07-31"
// startDay 25 + "2026-07-01" -> "2026-08-24"
export function lastDayOfPeriod(period: string, startDay = DEFAULT_PERIOD_START_DAY): string {
  const [y, m] = period.split("-").map(Number);
  return ymd(new Date(y, m, startDay - 1));
}

// rentang tanggal satu periode untuk filter query: [awal, awalPeriodeBerikutnya)
export function periodRange(
  period: string,
  startDay = DEFAULT_PERIOD_START_DAY
): { from: string; to: string } {
  return {
    from: periodStart(period, startDay),
    to: periodStart(shiftPeriod(period, 1), startDay),
  };
}

export function daysInPeriod(period: string, startDay = DEFAULT_PERIOD_START_DAY): number {
  const [y, m] = period.split("-").map(Number);
  const from = new Date(y, m - 1, startDay);
  const to = new Date(y, m, startDay);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

// "2026-07-01" -> "Juli 2026"
export function formatPeriodMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

// label singkat untuk sumbu chart: "2026-07-01" -> "Jul"
export function formatPeriodShort(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short" });
}

// startDay 1  -> "Juli 2026"
// startDay 25 -> "25 Jul – 24 Agu 2026"
export function formatPeriod(period: string, startDay = DEFAULT_PERIOD_START_DAY): string {
  if (startDay <= 1) return formatPeriodMonth(period);
  const from = parseYmd(periodStart(period, startDay));
  const to = parseYmd(lastDayOfPeriod(period, startDay));
  const sameYear = from.getFullYear() === to.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const fromLabel = from.toLocaleDateString("id-ID", sameYear ? opts : { ...opts, year: "numeric" });
  const toLabel = to.toLocaleDateString("id-ID", { ...opts, year: "numeric" });
  return `${fromLabel} – ${toLabel}`;
}

// jaga tanggal tetap di dalam periode, supaya catatan tidak nyasar lintas periode
export function clampDateToPeriod(
  dateStr: string,
  period: string,
  startDay = DEFAULT_PERIOD_START_DAY
): string {
  const first = periodStart(period, startDay);
  const last = lastDayOfPeriod(period, startDay);
  if (dateStr < first) return first;
  if (dateStr > last) return last;
  return dateStr;
}

export function todayStr(): string {
  const d = new Date();
  return ymd(d);
}

export function formatDate(dateStr: string): string {
  return parseYmd(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
