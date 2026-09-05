"use client";

import { formatPeriod, shiftPeriod } from "@/lib/format";
import { usePeriodStartDay } from "@/lib/settings";

export default function MonthPicker({
  period,
  onChange,
}: {
  period: string;
  onChange: (p: string) => void;
}) {
  const startDay = usePeriodStartDay();

  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-2 py-1 shadow-sm dark:bg-gray-900">
      <button
        onClick={() => onChange(shiftPeriod(period, -1))}
        className="px-3 py-2 text-lg text-gray-500 active:text-lime-700 dark:text-gray-400 dark:active:text-lime-400"
        aria-label="Periode sebelumnya"
      >
        ‹
      </button>
      <span className="text-sm font-semibold">{formatPeriod(period, startDay)}</span>
      <button
        onClick={() => onChange(shiftPeriod(period, 1))}
        className="px-3 py-2 text-lg text-gray-500 active:text-lime-700 dark:text-gray-400 dark:active:text-lime-400"
        aria-label="Periode berikutnya"
      >
        ›
      </button>
    </div>
  );
}
