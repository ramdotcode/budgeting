-- Jumlah hari custom untuk jatah per hari di Home (kategori "/hari")
-- daily_until = tanggal terakhir (ikut dihitung) pembagian sisa budget; null = pakai sisa hari periode.
-- Disimpan sebagai tanggal, bukan jumlah hari, supaya hitungannya mundur tiap hari:
-- isi "5 hari" hari ini -> besok otomatis jadi sisa 4 hari.

alter table public.budget_items
  add column daily_until date;
