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

// Date -> "2026-07-01" (tanggal 1 bulan tsb)
export function toPeriod(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function currentPeriod(): string {
  return toPeriod(new Date());
}

// "2026-07-01" -> "Juli 2026"
export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  return toPeriod(new Date(y, m - 1 + delta, 1));
}

// rentang tanggal satu bulan untuk filter query: [awal, awalBulanBerikutnya)
export function periodRange(period: string): { from: string; to: string } {
  return { from: period, to: shiftPeriod(period, 1) };
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
