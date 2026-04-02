-- Minimal supervisor schema support
-- Adds supervisors table + student assignment link + read policies for supervisor role.
-- This is additive and designed to avoid breaking existing student/company flows.

-- 1) Supervisors table (linked to profiles/auth user)
create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  department text,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists idx_supervisors_user_id on public.supervisors(user_id);

-- 2) Student -> supervisor assignment (nullable, safe backfill)
alter table if exists public.students
  add column if not exists supervisor_id uuid references public.supervisors(id) on delete set null;

create index if not exists idx_students_supervisor_id on public.students(supervisor_id);

-- 3) RLS enablement (idempotent)
alter table public.supervisors enable row level security;

-- 4) Supervisors can manage only their own supervisor row
drop policy if exists "supervisors_select_own" on public.supervisors;
create policy "supervisors_select_own"
on public.supervisors
for select
using (user_id = auth.uid());

drop policy if exists "supervisors_insert_own_supervisor_role" on public.supervisors;
create policy "supervisors_insert_own_supervisor_role"
on public.supervisors
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'supervisor'
  )
);

drop policy if exists "supervisors_update_own" on public.supervisors;
create policy "supervisors_update_own"
on public.supervisors
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 5) Supervisors can read only assigned students
drop policy if exists "students_select_assigned_supervisor" on public.students;
create policy "students_select_assigned_supervisor"
on public.students
for select
using (
  exists (
    select 1
    from public.supervisors sup
    where sup.id = students.supervisor_id
      and sup.user_id = auth.uid()
  )
);

-- 6) Supervisors can read profiles for their assigned students
drop policy if exists "profiles_select_assigned_supervisor_students" on public.profiles;
create policy "profiles_select_assigned_supervisor_students"
on public.profiles
for select
using (
  exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.id = s.supervisor_id
    where s.user_id = profiles.id
      and sup.user_id = auth.uid()
  )
);

-- 7) Supervisors can read applications belonging to assigned students
drop policy if exists "applications_select_assigned_supervisor_students" on public.applications;
create policy "applications_select_assigned_supervisor_students"
on public.applications
for select
using (
  exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.id = s.supervisor_id
    where s.id = applications.student_id
      and sup.user_id = auth.uid()
  )
);
