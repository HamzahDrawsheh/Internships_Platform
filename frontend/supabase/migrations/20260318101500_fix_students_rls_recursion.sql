-- =========================================================
-- Fix: infinite recursion in students RLS evaluation
-- =========================================================
-- Root cause:
-- A SELECT policy on public.students queried public.applications, while
-- SELECT policies on public.applications also query public.students.
-- This can create recursive policy evaluation at runtime.
--
-- Strategy:
-- 1) Keep direct ownership policies for students (read/insert/update).
-- 2) Replace company-applicant student read policy with a SECURITY DEFINER
--    helper that evaluates ownership joins without RLS recursion.
-- 3) Preserve supervisor/admin additive read behavior.

-- Ensure RLS remains enabled
alter table if exists public.students enable row level security;

-- Helper function used by students policy to avoid recursive policy chains.
create or replace function public.company_can_read_student(student_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications app
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where app.student_id = student_row_id
      and c.user_id = auth.uid()
  );
$$;

-- 1) Student can read only own student row (direct ownership).
drop policy if exists "students_select_own" on public.students;
create policy "students_select_own"
on public.students
for select
using (user_id = auth.uid());

-- 2) Student can insert only own student row (and only with student role).
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

-- 3) Student can update only own student row.
drop policy if exists "students_update_own" on public.students;
create policy "students_update_own"
on public.students
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 4) Company can read applicant student rows via helper (no recursive RLS).
drop policy if exists "students_select_company_applicants" on public.students;
create policy "students_select_company_applicants"
on public.students
for select
using (public.company_can_read_student(students.id));

-- Keep existing supervisor/admin SELECT policies intact:
-- - students_select_assigned_supervisor
-- - students_select_admin_all

