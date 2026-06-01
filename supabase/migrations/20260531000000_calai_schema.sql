-- Create calorie tracker domain schema

-- ── Extend profiles ──────────────────────────────────────────────────────────
alter table public.profiles add column if not exists calorie_goal integer not null default 2000;
alter table public.profiles add column if not exists protein_goal integer not null default 130;
alter table public.profiles add column if not exists carbs_goal integer not null default 220;
alter table public.profiles add column if not exists fat_goal integer not null default 65;
alter table public.profiles add column if not exists streak_count integer not null default 1;
alter table public.profiles add column if not exists last_logged_date date not null default current_date;

-- ── Food Logs ─────────────────────────────────────────────────────────────────
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

alter table public.food_logs enable row level security;

-- Policies
create policy "Users can read own food logs"
    on public.food_logs for select using (auth.uid() = user_id);

create policy "Users can insert own food logs"
    on public.food_logs for insert with check (auth.uid() = user_id);

create policy "Users can update own food logs"
    on public.food_logs for update using (auth.uid() = user_id);

create policy "Users can delete own food logs"
    on public.food_logs for delete using (auth.uid() = user_id);
