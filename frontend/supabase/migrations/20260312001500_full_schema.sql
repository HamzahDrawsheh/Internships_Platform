-- =========================================================
-- AI Intern Jordan - Supabase PostgreSQL Schema
-- Managed as migration file for Supabase CLI
-- Uses auth.users as authentication source
-- =========================================================

-- Extensions
create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Utility: updated_at trigger function
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 1) profiles
-- Linked 1:1 with auth.users(id), role-based identity
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null check (role in ('student','company','supervisor','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility for older installs that used 001_profiles.sql:
-- - role enum type (`public.role`)
-- - missing updated_at
alter table if exists public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- Drop policies that may depend on profiles.role type before conversion.
drop policy if exists "students_insert_own_student_role" on public.students;
drop policy if exists "companies_insert_own_company_role" on public.companies;
drop policy if exists "positions_insert_company_only" on public.internship_positions;
drop policy if exists "applications_insert_student_only" on public.applications;
drop policy if exists "ratings_insert_student" on public.ratings;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
      and udt_name = 'role'
  ) then
    alter table public.profiles
      alter column role type text using role::text;
  end if;
end;
$$;

alter table if exists public.profiles
  drop constraint if exists profiles_role_check;

alter table if exists public.profiles
  add constraint profiles_role_check
  check (role in ('student','company','supervisor','admin'));

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- =========================================================
-- 2) students
-- Student-specific details, linked to profiles(id)
-- =========================================================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  university text,
  major text,
  skills text,
  cv_url text,
  preferences text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3) companies
-- Company-specific details, linked to profiles(id)
-- =========================================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  company_name text not null,
  description text,
  location text,
  website text,
  contact_email text,
  logo_url text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 4) internship_positions
-- Internship listings created by companies
-- =========================================================
create table if not exists public.internship_positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  requirements text,
  duration text,
  location text,
  type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 5) applications
-- Student applications to internship positions
-- =========================================================
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  position_id uuid not null references public.internship_positions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  message text,
  applied_at timestamptz not null default now(),
  unique (student_id, position_id)
);

-- =========================================================
-- 6) ratings
-- Student feedback for companies (optionally tied to position)
-- =========================================================
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  position_id uuid references public.internship_positions(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default now(),
  unique (student_id, company_id, position_id)
);

-- =========================================================
-- Indexes (foreign keys + common lookups)
-- =========================================================
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_companies_user_id on public.companies(user_id);

create index if not exists idx_positions_company_id on public.internship_positions(company_id);
create index if not exists idx_positions_is_active on public.internship_positions(is_active);
create index if not exists idx_positions_created_at on public.internship_positions(created_at desc);

create index if not exists idx_applications_student_id on public.applications(student_id);
create index if not exists idx_applications_position_id on public.applications(position_id);
create index if not exists idx_applications_status on public.applications(status);
create index if not exists idx_applications_applied_at on public.applications(applied_at desc);

create index if not exists idx_ratings_student_id on public.ratings(student_id);
create index if not exists idx_ratings_company_id on public.ratings(company_id);
create index if not exists idx_ratings_position_id on public.ratings(position_id);
create index if not exists idx_ratings_created_at on public.ratings(created_at desc);

-- =========================================================
-- Optional but recommended: RLS baseline
-- =========================================================
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.companies enable row level security;
alter table public.internship_positions enable row level security;
alter table public.applications enable row level security;
alter table public.ratings enable row level security;

-- Profiles: users can read/update only their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

-- =========================================================
-- Auto-create profile after new auth user signup
-- =========================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'student'));

  if v_role not in ('student','company','supervisor','admin') then
    v_role := 'student';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- =========================================================
-- STUDENTS
-- =========================================================
drop policy if exists "students_select_own" on public.students;
create policy "students_select_own"
on public.students
for select
using (
  user_id = auth.uid()
);

drop policy if exists "students_insert_own_student_role" on public.students;
create policy "students_insert_own_student_role"
on public.students
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role = 'student'
  )
);

drop policy if exists "students_update_own" on public.students;
create policy "students_update_own"
on public.students
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================================================
-- COMPANIES
-- =========================================================
drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own"
on public.companies
for select
using (
  user_id = auth.uid()
);

drop policy if exists "companies_insert_own_company_role" on public.companies;
create policy "companies_insert_own_company_role"
on public.companies
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role = 'company'
  )
);

drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own"
on public.companies
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================================================
-- INTERNSHIP POSITIONS
-- =========================================================
drop policy if exists "positions_select_active" on public.internship_positions;
create policy "positions_select_active"
on public.internship_positions
for select
using (
  is_active = true
);

drop policy if exists "positions_insert_company_only" on public.internship_positions;
create policy "positions_insert_company_only"
on public.internship_positions
for insert
with check (
  exists (
    select 1
    from public.companies c
    join public.profiles p on p.id = c.user_id
    where c.id = internship_positions.company_id
    and p.id = auth.uid()
    and p.role = 'company'
  )
);

drop policy if exists "positions_update_own_company" on public.internship_positions;
create policy "positions_update_own_company"
on public.internship_positions
for update
using (
  exists (
    select 1
    from public.companies c
    where c.id = internship_positions.company_id
    and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies c
    where c.id = internship_positions.company_id
    and c.user_id = auth.uid()
  )
);

drop policy if exists "positions_delete_own_company" on public.internship_positions;
create policy "positions_delete_own_company"
on public.internship_positions
for delete
using (
  exists (
    select 1
    from public.companies c
    where c.id = internship_positions.company_id
    and c.user_id = auth.uid()
  )
);

-- =========================================================
-- APPLICATIONS
-- =========================================================
drop policy if exists "applications_select_student" on public.applications;
create policy "applications_select_student"
on public.applications
for select
using (
  exists (
    select 1
    from public.students s
    where s.id = applications.student_id
    and s.user_id = auth.uid()
  )
);

drop policy if exists "applications_insert_student_only" on public.applications;
create policy "applications_insert_student_only"
on public.applications
for insert
with check (
  exists (
    select 1
    from public.students s
    join public.profiles p on p.id = s.user_id
    where s.id = applications.student_id
    and p.id = auth.uid()
    and p.role = 'student'
  )
);

drop policy if exists "applications_select_company_positions" on public.applications;
create policy "applications_select_company_positions"
on public.applications
for select
using (
  exists (
    select 1
    from public.internship_positions pos
    join public.companies c on c.id = pos.company_id
    where pos.id = applications.position_id
    and c.user_id = auth.uid()
  )
);

drop policy if exists "applications_update_company_positions" on public.applications;
create policy "applications_update_company_positions"
on public.applications
for update
using (
  exists (
    select 1
    from public.internship_positions pos
    join public.companies c on c.id = pos.company_id
    where pos.id = applications.position_id
    and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.internship_positions pos
    join public.companies c on c.id = pos.company_id
    where pos.id = applications.position_id
    and c.user_id = auth.uid()
  )
);

-- =========================================================
-- RATINGS
-- =========================================================
drop policy if exists "ratings_select_student" on public.ratings;
create policy "ratings_select_student"
on public.ratings
for select
using (
  exists (
    select 1
    from public.students s
    where s.id = ratings.student_id
    and s.user_id = auth.uid()
  )
);

drop policy if exists "ratings_insert_student" on public.ratings;
create policy "ratings_insert_student"
on public.ratings
for insert
with check (
  exists (
    select 1
    from public.students s
    join public.profiles p on p.id = s.user_id
    where s.id = ratings.student_id
    and p.id = auth.uid()
    and p.role = 'student'
  )
);

drop policy if exists "ratings_select_company" on public.ratings;
create policy "ratings_select_company"
on public.ratings
for select
using (
  exists (
    select 1
    from public.companies c
    where c.id = ratings.company_id
    and c.user_id = auth.uid()
  )
);
