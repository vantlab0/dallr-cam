-- supabase/migrations/001_wallets.sql
--
-- Server-side credit wallet. Replaces localStorage persistence of
-- `wallet.balanceCredits` / `wallet.lifetimeTopUpUsd` so credits cannot be
-- tampered with from the client. Run this once in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  balance_credits integer not null default 0,
  lifetime_topup_usd numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_user_id_unique unique (user_id)
);

create table if not exists public.wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('topup', 'usage', 'refund')),
  credits integer not null,
  amount_usd numeric(12, 2) not null default 0,
  description text,
  reference text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists wallets_user_id_idx on public.wallets(user_id);
create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions(user_id);
create index if not exists wallet_transactions_created_at_idx
  on public.wallet_transactions(created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

-- Users can read their own wallet only.
create policy "Users can view their own wallet"
  on public.wallets
  for select
  using (auth.uid() = user_id);

-- Users can read their own transactions only.
create policy "Users can view their own transactions"
  on public.wallet_transactions
  for select
  using (auth.uid() = user_id);

-- All mutations (top-up, deduct, admin credit) are performed by the backend
-- with the service-role key, which bypasses RLS. Clients never insert or
-- update wallets directly.

-- ---------------------------------------------------------------------------
-- Auto-create a wallet row when a user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.wallets (user_id, balance_credits, lifetime_topup_usd)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic credit / deduct procedures (used by the backend, not the client)
-- ---------------------------------------------------------------------------

create or replace function public.credit_wallet(
  p_user_id uuid,
  p_credits integer,
  p_amount_usd numeric,
  p_description text,
  p_reference text
) returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
begin
  update public.wallets
  set balance_credits = balance_credits + p_credits,
      lifetime_topup_usd = lifetime_topup_usd + p_amount_usd,
      updated_at = now()
  where user_id = p_user_id
  returning balance_credits into v_balance;

  if not found then
    raise exception 'wallet not found for user %', p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, type, credits, amount_usd, description, reference)
  values (p_user_id, 'topup', p_credits, p_amount_usd, p_description, p_reference);

  return v_balance;
end;
$$;

create or replace function public.deduct_wallet_balance(
  p_user_id uuid,
  p_credits integer,
  p_description text
) returns integer
language plpgsql
security definer
as $$
declare
  v_balance integer;
begin
  update public.wallets
  set balance_credits = balance_credits - p_credits,
      updated_at = now()
  where user_id = p_user_id
    and balance_credits >= p_credits
  returning balance_credits into v_balance;

  if not found then
    return -1;
  end if;

  return v_balance;
end;
$$;
