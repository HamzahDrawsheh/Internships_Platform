-- =========================================================
-- Admin read-access support (minimal, additive, idempotent)
-- Goal: allow authenticated admin users to SELECT platform-wide data
-- without changing existing student/company/supervisor behavior.
-- =========================================================

-- Helper: resolve admin role from public.profiles using auth.uid().
-- SECURITY DEFINER avoids recursive RLS checks when used by profiles policy.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- Keep RLS explicitly enabled on covered tables.
alter table if exists public.profiles enable row level security;
alter table if exists public.students enable row level security;
alter table if exists public.supervisors enable row level security;
alter table if exists public.companies enable row level security;
alter table if exists public.internship_positions enable row level security;
alter table if exists public.applications enable row level security;

-- PROFILES
drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all"
on public.profiles
for select
using (public.is_admin_user());

-- STUDENTS
drop policy if exists "students_select_admin_all" on public.students;
create policy "students_select_admin_all"
on public.students
for select
using (public.is_admin_user());

-- SUPERVISORS
drop policy if exists "supervisors_select_admin_all" on public.supervisors;
create policy "supervisors_select_admin_all"
on public.supervisors
for select
using (public.is_admin_user());

-- COMPANIES
drop policy if exists "companies_select_admin_all" on public.companies;
create policy "companies_select_admin_all"
on public.companies
for select
using (public.is_admin_user());

-- INTERNSHIP POSITIONS
drop policy if exists "internship_positions_select_admin_all" on public.internship_positions;
create policy "internship_positions_select_admin_all"
on public.internship_positions
for select
using (public.is_admin_user());

-- APPLICATIONS
drop policy if exists "applications_select_admin_all" on public.applications;
create policy "applications_select_admin_all"
on public.applications
for select
using (public.is_admin_user());

