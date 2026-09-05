"use client";

import { useState } from "react";
import {
  MAX_PERIOD_START_DAY,
  MIN_PERIOD_START_DAY,
  currentPeriod,
  formatPeriod,
} from "@/lib/format";
import { useSettings } from "@/lib/settings";

const PRESETS = [1, 20, 25, 28];

export default function PeriodStartSetting() {
  const { startDay, saveStartDay } = useSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(startDay);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSheet() {
    setDraft(startDay);
    setError(null);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const message = await saveStartDay(draft);
    setSaving(false);
    if (message) setError(message);
    else setOpen(false);
  }

  const valid = draft >= MIN_PERIOD_START_DAY && draft <= MAX_PERIOD_START_DAY;

  return (
    <>
      <button
        onClick={openSheet}
        className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-sm active:bg-gray-50 dark:bg-gray-900 dark:active:bg-gray-800"
      >
        <span className="text-xl">🗓️</span>
        <div className="flex-1">
          <p className="font-medium">Mulai periode</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {startDay === 1
              ? "Tanggal 1 (ikut kalender)"
              : `Tanggal ${startDay} · ${formatPeriod(currentPeriod(startDay), startDay)}`}
          </p>
        </div>
        <span className="text-gray-300 dark:text-gray-600">›</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-lg font-bold">🗓️ Mulai Periode</h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Tanggal berapa budget bulananmu di-reset? Isi tanggal gajianmu supaya periode
              budget pas dengan uang masuk.
            </p>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDraft(d)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      draft === d
                        ? "border-lime-500 bg-lime-100 font-semibold text-lime-800 dark:bg-lime-950 dark:text-lime-300"
                        : "border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {d === 1 ? "1 (kalender)" : `Tgl ${d}`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">Tanggal</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_PERIOD_START_DAY}
                  max={MAX_PERIOD_START_DAY}
                  value={draft || ""}
                  onChange={(e) => setDraft(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-lime-500 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>

              {valid ? (
                <div className="rounded-xl bg-sky-50 px-4 py-3 text-center dark:bg-sky-950">
                  <p className="text-sm text-sky-700 dark:text-sky-300">Periode berjalan jadi</p>
                  <p className="text-lg font-bold text-sky-800 dark:text-sky-200">
                    {formatPeriod(currentPeriod(draft), draft)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Isi antara {MIN_PERIOD_START_DAY}–{MAX_PERIOD_START_DAY}. Dibatasi 28 supaya
                  tanggalnya selalu ada di setiap bulan.
                </p>
              )}

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                onClick={save}
                disabled={saving || !valid}
                className="w-full rounded-xl bg-lime-400 py-3 font-semibold text-lime-950 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Catatan lama tidak berubah, hanya pengelompokan periodenya yang ikut bergeser.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
