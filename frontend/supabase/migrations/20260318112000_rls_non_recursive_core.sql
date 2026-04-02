-- =========================================================
-- Non-recursive core RLS reset for students/applications chain
-- =========================================================
-- Purpose:
-- Eliminate recursive RLS evaluation across:
--   public.students <-> public.applications
-- while preserving intended access for student/company/supervisor/admin.

-- ---------------------------------------------------------
-- Helper authz functions (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------
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

create or replace function public.is_student_user()
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
      and p.role = 'student'
  );
$$;

create or replace function public.owns_student_row(student_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = student_row_id
      and s.user_id = auth.uid()
  );
$$;

create or replace function public.company_owns_position(position_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.internship_positions pos
    join public.companies c on c.id = pos.company_id
    where pos.id = position_row_id
      and c.user_id = auth.uid()
  );
$$;

create or replace function public.supervisor_assigned_student(student_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.id = s.supervisor_id
    where s.id = student_row_id
      and sup.user_id = auth.uid()
  );
$$;

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

create or replace function public.company_can_read_profile(profile_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.applications app on app.student_id = s.id
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where s.user_id = profile_row_id
      and c.user_id = auth.uid()
  );
$$;

create or replace function public.supervisor_can_read_profile(profile_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.id = s.supervisor_id
    where s.user_id = profile_row_id
      and sup.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------
-- Ensure RLS enabled on involved tables
-- ---------------------------------------------------------
alter table if exists public.profiles enable row level security;
alter table if exists public.students enable row level security;
alter table if exists public.companies enable row level security;
alter table if exists public.internship_positions enable row level security;
alter table if exists public.applications enable row level security;

-- ---------------------------------------------------------
-- PROFILES policies
-- ---------------------------------------------------------
drop policy if exists "Users can read and update own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_company_applicant_profiles" on public.profiles;
drop policy if exists "profiles_select_assigned_supervisor_students" on public.profiles;
drop policy if exists "profiles_select_admin_all" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_select_company_applicant_profiles"
on public.profiles
for select
using (public.company_can_read_profile(profiles.id));

create policy "profiles_select_assigned_supervisor_students"
on public.profiles
for select
using (public.supervisor_can_read_profile(profiles.id));

create policy "profiles_select_admin_all"
on public.profiles
for select
using (public.is_admin_user());

-- ---------------------------------------------------------
-- STUDENTS policies (non-recursive core)
-- ---------------------------------------------------------
drop policy if exists "students_select_own" on public.students;
drop policy if exists "students_insert_own_student_role" on public.students;
drop policy if exists "students_update_own" on public.students;
drop policy if exists "students_select_company_applicants" on public.students;
drop policy if exists "students_select_assigned_supervisor" on public.students;
drop policy if exists "students_select_admin_all" on public.students;

create policy "students_select_own"
on public.students
for select
using (user_id = auth.uid());

create policy "students_insert_own_student_role"
on public.students
for insert
with check (
  user_id = auth.uid()
  and public.is_student_user()
);

create policy "students_update_own"
on public.students
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "students_select_company_applicants"
on public.students
for select
using (public.company_can_read_student(students.id));

create policy "students_select_assigned_supervisor"
on public.students
for select
using (public.supervisor_assigned_student(students.id));

create policy "students_select_admin_all"
on public.students
for select
using (public.is_admin_user());

-- ---------------------------------------------------------
-- COMPANIES policies
-- ---------------------------------------------------------
drop policy if exists "companies_select_own" on public.companies;
drop policy if exists "companies_insert_own_company_role" on public.companies;
drop policy if exists "companies_update_own" on public.companies;
drop policy if exists "companies_select_admin_all" on public.companies;

create policy "companies_select_own"
on public.companies
for select
using (user_id = auth.uid());

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

create policy "companies_update_own"
on public.companies
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "companies_select_admin_all"
on public.companies
for select
using (public.is_admin_user());

-- ---------------------------------------------------------
-- INTERNSHIP POSITIONS policies
-- ---------------------------------------------------------
drop policy if exists "positions_select_active" on public.internship_positions;
drop policy if exists "positions_insert_company_only" on public.internship_positions;
drop policy if exists "positions_update_own_company" on public.internship_positions;
drop policy if exists "positions_delete_own_company" on public.internship_positions;
drop policy if exists "internship_positions_select_admin_all" on public.internship_positions;

create policy "positions_select_active"
on public.internship_positions
for select
using (is_active = true);

create policy "positions_insert_company_only"
on public.internship_positions
for insert
with check (public.company_owns_position(internship_positions.id) or exists (
  select 1
  from public.companies c
  where c.id = internship_positions.company_id
    and c.user_id = auth.uid()
));

create policy "positions_update_own_company"
on public.internship_positions
for update
using (public.company_owns_position(internship_positions.id))
with check (public.company_owns_position(internship_positions.id));

create policy "positions_delete_own_company"
on public.internship_positions
for delete
using (public.company_owns_position(internship_positions.id));

create policy "internship_positions_select_admin_all"
on public.internship_positions
for select
using (public.is_admin_user());

-- ---------------------------------------------------------
-- APPLICATIONS policies (non-recursive via helpers)
-- ---------------------------------------------------------
drop policy if exists "applications_select_student" on public.applications;
drop policy if exists "applications_insert_student_only" on public.applications;
drop policy if exists "applications_select_company_positions" on public.applications;
drop policy if exists "applications_update_company_positions" on public.applications;
drop policy if exists "applications_select_assigned_supervisor_students" on public.applications;
drop policy if exists "applications_select_admin_all" on public.applications;

create policy "applications_select_student"
on public.applications
for select
using (public.owns_student_row(applications.student_id));

create policy "applications_insert_student_only"
on public.applications
for insert
with check (
  public.owns_student_row(applications.student_id)
  and public.is_student_user()
);

create policy "applications_select_company_positions"
on public.applications
for select
using (public.company_owns_position(applications.position_id));

create policy "applications_update_company_positions"
on public.applications
for update
using (public.company_owns_position(applications.position_id))
with check (public.company_owns_position(applications.position_id));

create policy "applications_select_assigned_supervisor_students"
on public.applications
for select
using (public.supervisor_assigned_student(applications.student_id));

create policy "applications_select_admin_all"
on public.applications
for select
using (public.is_admin_user());

