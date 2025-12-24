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
