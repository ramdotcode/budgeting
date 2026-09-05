-- Preferensi per user, termasuk tanggal mulai periode budget (hari "reset" bulanan)
-- period_start_day = 1 berarti periode mengikuti kalender (1 s/d akhir bulan).
-- period_start_day = 25 berarti periode berjalan 25 bulan ini s/d 24 bulan berikutnya,
-- cocok untuk yang mengatur budget mengikuti tanggal gajian.
-- Dibatasi 1-28 supaya tanggalnya selalu ada di setiap bulan (termasuk Februari).

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  period_start_day integer not null default 1 check (period_start_day between 1 and 28),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
