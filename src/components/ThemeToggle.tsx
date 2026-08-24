"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Terang", icon: "☀️" },
  { value: "dark", label: "Gelap", icon: "🌙" },
  { value: "system", label: "Sistem", icon: "⚙️" },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- baca preferensi tersimpan saat mount
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    if (t === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", t);
    const dark =
      t === "dark" ||
      (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  return (
    <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm dark:bg-gray-900">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => apply(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            theme === o.value
              ? "bg-lime-400 text-lime-950 shadow-sm"
              : "text-gray-500 active:bg-gray-50 dark:text-gray-400 dark:active:bg-gray-800"
          }`}
        >
          <span>{o.icon}</span> {o.label}
        </button>
      ))}
    </div>
  );
}
