-- Run this entire file once in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  engineer text not null,
  crew_id uuid references public.crews(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  location text,
  work_type text,
  status text not null default 'Assigned',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.crews enable row level security;
alter table public.projects enable row level security;
alter table public.assignments enable row level security;

-- Simple shared internal site policies.
-- Later we can replace these with login-based permissions.
drop policy if exists "public read crews" on public.crews;
drop policy if exists "public write crews" on public.crews;
drop policy if exists "public read projects" on public.projects;
drop policy if exists "public write projects" on public.projects;
drop policy if exists "public read assignments" on public.assignments;
drop policy if exists "public write assignments" on public.assignments;

create policy "public read crews" on public.crews for select using (true);
create policy "public write crews" on public.crews for all using (true) with check (true);

create policy "public read projects" on public.projects for select using (true);
create policy "public write projects" on public.projects for all using (true) with check (true);

create policy "public read assignments" on public.assignments for select using (true);
create policy "public write assignments" on public.assignments for all using (true) with check (true);

insert into public.projects (code, name)
values
  ('WS-742', 'Water Main Replacement'),
  ('WS-743', 'Water Main Replacement')
on conflict (code) do nothing;
