-- Canonical schema definition for Supabase.
-- Ensure only one profiles table definition exists in the repo.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  tier text default 'free',
  credits integer not null default 50,
  created_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  image_url text not null,
  config jsonb not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);
