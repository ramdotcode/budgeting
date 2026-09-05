-- Pembagian harian per budget item (pocket)
-- split_days = jumlah hari untuk membagi alokasi, null = tidak dibagi

alter table public.budget_items
  add column split_days integer check (split_days between 1 and 366);
