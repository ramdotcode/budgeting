"use client";

import { formatAmountInput, parseAmount } from "@/lib/format";

export default function AmountInput({
  value,
  onChange,
  placeholder = "0",
  autoFocus,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center rounded-xl border border-gray-300 bg-white px-4 focus-within:border-indigo-500 dark:border-gray-700 dark:bg-gray-900">
      <span className="mr-2 text-gray-400">Rp</span>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        value={value ? formatAmountInput(value) : ""}
        onChange={(e) => onChange(parseAmount(e.target.value))}
        placeholder={placeholder}
        className="w-full py-3 text-base outline-none"
      />
    </div>
  );
}
