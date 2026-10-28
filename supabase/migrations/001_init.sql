-- PaperPal database schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── profiles ────────────────────────────────────────────────────────────────────
-- One row per user. id is the Supabase auth.users UUID.
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  school_name     text not null,
  teacher_name    text not null,
  role            text not null check (role in ('Teacher', 'Head of Department', 'Examiner')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Row Level Security: each user can only read and update their own profile.
alter table public.profiles enable row level security;

create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-update updated_at on any row change.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── papers ───────────────────────────────────────────────────────────────────────
-- One row per generated paper. paper_json stores the full GeneratedPaper object.
create table if not exists public.papers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  subject          text not null,
  level            text not null,
  total_marks      integer not null,
  duration_minutes integer not null,
  paper_json       jsonb not null,
  created_at       timestamptz not null default now()
);

-- Index for fast per-user history queries.
create index if not exists papers_user_id_created_at
  on public.papers (user_id, created_at desc);

-- Row Level Security: each user can only see and insert their own papers.
alter table public.papers enable row level security;

create policy "papers: owner read"
  on public.papers for select
  using (auth.uid() = user_id);

create policy "papers: owner insert"
  on public.papers for insert
  with check (auth.uid() = user_id);

-- ── Google OAuth: auto-create a skeleton profile on first sign-in ─────────────
-- This trigger fires after a new user row is created in auth.users.
-- For Google OAuth users the profile has a placeholder until they complete
-- the /app/profile-setup page.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Only insert if not already present (email signup already inserts via the API)
  insert into public.profiles (id, school_name, teacher_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'organization', ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    'Teacher'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
