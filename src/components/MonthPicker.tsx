"use client";

import { formatPeriod, shiftPeriod } from "@/lib/format";

export default function MonthPicker({
  period,
  onChange,
}: {
  period: string;
  onChange: (p: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-2 py-1 shadow-sm dark:bg-gray-900">
      <button
        onClick={() => onChange(shiftPeriod(period, -1))}
        className="px-3 py-2 text-lg text-gray-500 active:text-indigo-600 dark:text-gray-400 dark:active:text-indigo-400"
        aria-label="Bulan sebelumnya"
      >
        ‹
      </button>
      <span className="text-sm font-semibold">{formatPeriod(period)}</span>
      <button
        onClick={() => onChange(shiftPeriod(period, 1))}
        className="px-3 py-2 text-lg text-gray-500 active:text-indigo-600 dark:text-gray-400 dark:active:text-indigo-400"
        aria-label="Bulan berikutnya"
      >
        ›
      </button>
    </div>
  );
}
