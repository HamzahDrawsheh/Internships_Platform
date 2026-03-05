-- Run this in Supabase SQL Editor if the profiles table does not exist.
-- For full schema (profiles + internships + applications) see CONTEXT_ENG/supabase-schema.sql.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text check (role in ('student', 'company', 'supervisor', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: users can read/update their own row; insert allowed for own id.
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
