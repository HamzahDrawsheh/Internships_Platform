-- =========================================================
-- Fix infinite RLS recursion (42P17) on relation "profiles"
-- =========================================================
-- Messaging added permissive SELECT policies on profiles that contained
-- EXISTS(...) subqueries over students / applications. Evaluating those
-- subqueries under RLS re-entered profiles together with supervisors
-- policies → Postgres reports recursion on "profiles".
--
-- Pattern: move eligibility checks into SECURITY DEFINER SQL helpers so
-- nested scans do not recurse through profiles RLS (same idea as
-- company_can_read_profile / owns_student_row).

-- Student may read a supervisor peer profile (profiles.id = supervisors.user_id)
create or replace function public.dm_student_can_read_supervisor_profile(supervisor_profile_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.user_id = supervisor_profile_user_id
    where s.user_id = auth.uid()
      and (
        s.supervisor_id = sup.id
        or (
          length(trim(coalesce(sup.department, ''))) > 0
          and length(trim(coalesce(s.department, ''))) > 0
          and lower(trim(s.department)) = lower(trim(sup.department))
        )
      )
  );
$$;

-- Student may read a company-owner profile they applied to (profiles.id = companies.user_id)
create or replace function public.dm_student_can_read_company_profile(company_owner_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications app
    join public.students s on s.id = app.student_id
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where s.user_id = auth.uid()
      and c.user_id = company_owner_user_id
  );
$$;

-- Supervisor may read student profiles in the same department (existing policy logic)
create or replace function public.supervisor_same_department_student_profile_visible(student_profile_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.user_id = auth.uid()
    where s.user_id = student_profile_user_id
      and lower(trim(s.department)) = lower(trim(sup.department))
  );
$$;

grant execute on function public.dm_student_can_read_supervisor_profile(uuid) to authenticated;
grant execute on function public.dm_student_can_read_company_profile(uuid) to authenticated;
grant execute on function public.supervisor_same_department_student_profile_visible(uuid) to authenticated;

drop policy if exists "profiles_select_supervisors_for_student_dm" on public.profiles;
create policy "profiles_select_supervisors_for_student_dm"
on public.profiles
for select
to authenticated
using (
  role = 'supervisor'
  and public.dm_student_can_read_supervisor_profile(profiles.id)
);

drop policy if exists "profiles_select_company_for_applicant_dm" on public.profiles;
create policy "profiles_select_company_for_applicant_dm"
on public.profiles
for select
to authenticated
using (
  role = 'company'
  and public.dm_student_can_read_company_profile(profiles.id)
);

drop policy if exists "Supervisors can view profiles of students in same department" on public.profiles;
create policy "Supervisors can view profiles of students in same department"
on public.profiles
for select
to authenticated
using (public.supervisor_same_department_student_profile_visible(profiles.id));
