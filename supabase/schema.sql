-- Quote Master Tracker — Supabase schema
-- Run this in Supabase: Dashboard → SQL Editor → New Query → paste → Run.
-- Every table has a user_id column tied to auth.users, with Row Level Security
-- so each logged-in user only ever sees their own rows. If this dashboard is
-- for just you, you'll be the only user — RLS is still worth keeping on so a
-- second account (e.g. a colleague) never sees your pricing data by accident.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- master_quotes  (Account Summary View)
-- ---------------------------------------------------------------------------
create table master_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,                    -- device|package|customer|service_type, normalized
  device text not null,
  package text,
  customer text not null,
  service_type text not null,
  supplier text,
  charges jsonb not null default '[]',  -- [{label, amount}]
  total_cost numeric not null default 0,
  selling_price numeric not null default 0,
  margin_pct numeric not null default 0,
  markup_pct numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'Active',
  last_quoted_date date,
  quote_ref text,
  gold_category text,
  description text,
  service_coverage text,
  specs jsonb not null default '{}',
  notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);
create index master_quotes_user_idx on master_quotes(user_id);

-- ---------------------------------------------------------------------------
-- quotation_log  (append-only history behind Quote History / Quotation Log)
-- ---------------------------------------------------------------------------
create table quotation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  device text,
  package text,
  customer text,
  service_type text,
  supplier text,
  charges jsonb not null default '[]',
  total_cost numeric,
  selling_price numeric,
  margin_pct numeric,
  markup_pct numeric,
  currency text,
  date date not null default current_date,
  quote_ref text,
  notes text,
  created_at timestamptz not null default now()
);
create index quotation_log_user_key_idx on quotation_log(user_id, key);

-- ---------------------------------------------------------------------------
-- gold_adder_tables  (Gold Wire Adder — one row per customer per user)
-- ---------------------------------------------------------------------------
create table gold_adder_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer text not null,
  mode text not null default 'flat',     -- 'flat' | 'percent'
  brackets jsonb not null default '[]',
  current_price numeric,
  price_updated_at date,
  updated_at timestamptz not null default now(),
  unique (user_id, customer)
);

-- ---------------------------------------------------------------------------
-- rfq_records  (Mini CRM)
-- ---------------------------------------------------------------------------
create table rfq_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  rfq_number text,
  device_name text not null,
  end_application text,
  pkg_type text,
  body_size text,
  rfq_received_date date,
  volume_per_year numeric,
  project_type text,
  bom text,
  pcn text,
  pcn_duration text,
  business_mode text,
  expected_qual_date date,
  lvm_date date,
  hvm_date date,
  quoted text default 'No',
  quote_date date,
  asp numeric,
  op_pct numeric,
  nre_required text default 'No',
  nre_amount numeric,
  status text not null default 'Open',
  awarded_date date,
  kick_off_date date,
  npi_status text,
  remark text,
  master_promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rfq_records_user_idx on rfq_records(user_id);

-- ---------------------------------------------------------------------------
-- raw_material_prices  (Raw Material Price Tracker)
-- ---------------------------------------------------------------------------
create table raw_material_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material text not null,
  device_name text,
  customer text,
  price numeric not null,
  unit text,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index raw_material_prices_user_idx on raw_material_prices(user_id);

-- ---------------------------------------------------------------------------
-- market_insights  (cached daily AI-fetched news feed — one row per user)
-- ---------------------------------------------------------------------------
create table market_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insights jsonb not null default '[]',
  fetched_at timestamptz,
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security — every table, same pattern: you can only touch your own rows
-- ---------------------------------------------------------------------------
alter table master_quotes enable row level security;
alter table quotation_log enable row level security;
alter table gold_adder_tables enable row level security;
alter table rfq_records enable row level security;
alter table raw_material_prices enable row level security;
alter table market_insights enable row level security;

create policy "own rows only" on master_quotes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on quotation_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on gold_adder_tables for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on rfq_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on raw_material_prices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on market_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- auto-update updated_at on master_quotes edits
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger master_quotes_updated_at before update on master_quotes
  for each row execute function set_updated_at();
create trigger rfq_records_updated_at before update on rfq_records
  for each row execute function set_updated_at();
