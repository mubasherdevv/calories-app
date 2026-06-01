-- ═══════════════════════════════════════════════════════════════════════════
-- Cal AI — Full Auth + Profile Setup
-- Run this SQL in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Profiles table (if not exists) ────────────────────────────────────────
create table if not exists public.profiles (
    id              uuid primary key references auth.users(id) on delete cascade,
    display_name    text,
    calorie_goal    integer not null default 2000,
    protein_goal    integer not null default 130,
    carbs_goal      integer not null default 220,
    fat_goal        integer not null default 65,
    streak_count    integer not null default 1,
    last_logged_date date not null default current_date,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ── 2. Row Level Security on profiles ────────────────────────────────────────
alter table public.profiles enable row level security;

-- Drop existing policies if any, then recreate cleanly
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can read own profile"
    on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert with check (auth.uid() = id);

-- ── 3. Auto-create profile on signup ─────────────────────────────────────────
-- This trigger fires every time a new user signs up (email OTP, Google, Apple)
-- and creates their profile row automatically.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.email)
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- Drop old trigger if exists, recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- ── 4. Food Logs table (if not exists) ───────────────────────────────────────
create table if not exists public.food_logs (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade not null,
    name        text not null,
    meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
    calories    integer not null check (calories >= 0),
    protein     numeric not null default 0 check (protein >= 0),
    carbs       numeric not null default 0 check (carbs >= 0),
    fat         numeric not null default 0 check (fat >= 0),
    image_uri   text,
    logged_at   timestamptz not null default now(),
    created_at  timestamptz not null default now()
);

-- ── 5. Row Level Security on food_logs ───────────────────────────────────────
alter table public.food_logs enable row level security;

drop policy if exists "Users can read own food logs" on public.food_logs;
drop policy if exists "Users can insert own food logs" on public.food_logs;
drop policy if exists "Users can update own food logs" on public.food_logs;
drop policy if exists "Users can delete own food logs" on public.food_logs;

create policy "Users can read own food logs"
    on public.food_logs for select using (auth.uid() = user_id);

create policy "Users can insert own food logs"
    on public.food_logs for insert with check (auth.uid() = user_id);

create policy "Users can update own food logs"
    on public.food_logs for update using (auth.uid() = user_id);

create policy "Users can delete own food logs"
    on public.food_logs for delete using (auth.uid() = user_id);

-- ── 6. Add goal columns to profiles (safe, idempotent) ───────────────────────
alter table public.profiles add column if not exists calorie_goal integer not null default 2000;
alter table public.profiles add column if not exists protein_goal integer not null default 130;
alter table public.profiles add column if not exists carbs_goal   integer not null default 220;
alter table public.profiles add column if not exists fat_goal     integer not null default 65;
alter table public.profiles add column if not exists streak_count integer not null default 1;
alter table public.profiles add column if not exists last_logged_date date not null default current_date;

-- ── Done ─────────────────────────────────────────────────────────────────────
-- Your Cal AI database is now ready!
-- Users who sign up will automatically get a profile row.
-- food_logs are secured per-user with RLS.
