"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PERIOD_START_DAY, normalizePeriodStartDay } from "@/lib/format";

const CACHE_KEY = "period_start_day";

interface SettingsValue {
  startDay: number;
  /** true setelah setelan tersimpan selesai dibaca — pakai untuk menunda query */
  ready: boolean;
  /** null = sukses, string = pesan error untuk ditampilkan */
  saveStartDay: (day: number) => Promise<string | null>;
}

const SettingsContext = createContext<SettingsValue>({
  startDay: DEFAULT_PERIOD_START_DAY,
  ready: false,
  saveStartDay: async () => null,
});

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}

export function usePeriodStartDay(): number {
  return useSettings().startDay;
}

function readCache(): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? normalizePeriodStartDay(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(day: number) {
  try {
    localStorage.setItem(CACHE_KEY, String(day));
  } catch {
    // storage tidak tersedia (private mode) — cukup andalkan Supabase
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [startDay, setStartDay] = useState(DEFAULT_PERIOD_START_DAY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    // pakai nilai cache dulu supaya periode tidak "lompat" saat halaman baru dibuka
    const cached = readCache();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- baca preferensi tersimpan saat mount
    if (cached !== null) setStartDay(cached);

    (async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("period_start_day")
        .maybeSingle();
      if (!alive) return;
      // error = tabel belum ada (migration 00003 belum dijalankan) -> pakai default
      if (!error && data) {
        const day = normalizePeriodStartDay((data as { period_start_day: number }).period_start_day);
        setStartDay(day);
        writeCache(day);
      }
      setReady(true);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveStartDay = useCallback(
    async (day: number): Promise<string | null> => {
      const value = normalizePeriodStartDay(day);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return "Sesi berakhir, silakan login ulang.";

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          { user_id: user.id, period_start_day: value, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) {
        return "Gagal menyimpan. Pastikan migration 00003_user_settings.sql sudah dijalankan di Supabase SQL Editor.";
      }
      setStartDay(value);
      writeCache(value);
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <SettingsContext.Provider value={{ startDay, ready, saveStartDay }}>
      {children}
    </SettingsContext.Provider>
  );
}
