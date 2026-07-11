-- Schema awal aplikasi budgeting
-- Semua tabel di-scope per user via RLS (user_id = auth.uid())

-- ===== Tables =====

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text not null default '📦',
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period date not null, -- selalu tanggal 1, contoh: 2026-07-01
  created_at timestamptz not null default now(),
  unique (user_id, period),
  check (extract(day from period) = 1)
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  budget_id uuid not null references public.budgets (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  allocated_amount numeric(14, 2) not null check (allocated_amount >= 0),
  unique (budget_id, category_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  budget_item_id uuid not null references public.budget_items (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index incomes_user_date_idx on public.incomes (user_id, date);
create index expenses_user_date_idx on public.expenses (user_id, date);
create index expenses_budget_item_idx on public.expenses (budget_item_id);
create index budget_items_budget_idx on public.budget_items (budget_id);

-- ===== Row Level Security =====

alter table public.categories enable row level security;
alter table public.incomes enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.expenses enable row level security;

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own incomes" on public.incomes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own budget_items" on public.budget_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== View: ringkasan budget per kategori =====
-- security_invoker supaya RLS tabel dasar tetap berlaku saat query view

create view public.budget_summary
  with (security_invoker = true) as
select
  bi.id as budget_item_id,
  b.user_id,
  b.period,
  bi.category_id,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  bi.allocated_amount,
  coalesce(sum(e.amount), 0) as spent,
  bi.allocated_amount - coalesce(sum(e.amount), 0) as remaining
from public.budget_items bi
join public.budgets b on b.id = bi.budget_id
join public.categories c on c.id = bi.category_id
left join public.expenses e on e.budget_item_id = bi.id
group by bi.id, b.user_id, b.period, bi.category_id, c.name, c.icon, c.color, bi.allocated_amount;
