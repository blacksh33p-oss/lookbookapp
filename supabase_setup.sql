-- Supabase setup script

create table if not exists public.profiles (
  id uuid not null primary key references auth.users (id) on delete cascade,
  email text,
  tier text,
  credits integer not null default 50,
  created_at timestamp with time zone not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, tier, credits)
  values (new.id, new.email, 'Free', 50);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
