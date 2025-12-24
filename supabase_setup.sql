-- Create the Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Create the Generations table
create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  image_url text not null,
  config jsonb not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

-- Ensure existing foreign keys use ON DELETE CASCADE
alter table if exists projects
  drop constraint if exists projects_user_id_fkey;

alter table if exists projects
  add constraint projects_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists generations
  drop constraint if exists generations_user_id_fkey;

alter table if exists generations
  add constraint generations_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
