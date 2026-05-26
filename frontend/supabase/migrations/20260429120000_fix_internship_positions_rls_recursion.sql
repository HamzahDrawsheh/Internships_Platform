-- ---------------------------------------------------------------------------
-- Supervisor application history RLS: non-recursive helpers + policies.
-- Run in order: (1) drop policies, (2) create functions, (3) create policies.
-- If policies reference helpers before functions exist, you get:
--   function public.supervisor_same_dept_application_for_position(uuid) does not exist
-- ---------------------------------------------------------------------------

-- ========= 1) DROP: remove policies that may reference missing or old helpers =========

drop policy if exists "internship_positions_select_supervisor_same_department_applications"
  on public.internship_positions;

drop policy if exists "companies_select_supervisor_same_department_applications"
  on public.companies;

-- ========= 2) CREATE: helper functions (SECURITY DEFINER; inner scan without RLS re-entry) =========
-- public.supervisor_same_dept_application_for_position:
--   Used BY internship_positions RLS — must NOT query public.internship_positions (avoids recursion with
--   company_owns_position on applications that reads positions).
-- public.supervisor_same_dept_application_for_company:
--   Used BY companies RLS — may join positions only with row_security disabled inside the function
--   so those reads do not re-enter companies/positions RLS in a loop.

create or replace function public.supervisor_same_dept_application_for_position(p_position_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  set local row_security = off;
  return exists (
    select 1
    from public.applications app
    join public.students s on s.id = app.student_id
    join public.supervisors sup on sup.user_id = auth.uid()
    where app.position_id = p_position_id
      and lower(trim(s.department)) = lower(trim(sup.department))
  );
end;
$$;

create or replace function public.supervisor_same_dept_application_for_company(p_company_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  set local row_security = off;
  return exists (
    select 1
    from public.applications app
    join public.internship_positions pos on pos.id = app.position_id
    join public.students s on s.id = app.student_id
    join public.supervisors sup on sup.user_id = auth.uid()
    where pos.company_id = p_company_id
      and lower(trim(s.department)) = lower(trim(sup.department))
  );
end;
$$;

revoke all on function public.supervisor_same_dept_application_for_position(uuid) from public;
revoke all on function public.supervisor_same_dept_application_for_company(uuid) from public;
grant execute on function public.supervisor_same_dept_application_for_position(uuid) to authenticated;
grant execute on function public.supervisor_same_dept_application_for_company(uuid) to authenticated;
grant execute on function public.supervisor_same_dept_application_for_position(uuid) to service_role;
grant execute on function public.supervisor_same_dept_application_for_company(uuid) to service_role;

-- ========= 3) CREATE: RLS policies (only after functions exist) =========

create policy "internship_positions_select_supervisor_same_department_applications"
on public.internship_positions
for select
to authenticated
using ( public.supervisor_same_dept_application_for_position(internship_positions.id) );

create policy "companies_select_supervisor_same_department_applications"
on public.companies
for select
to authenticated
using ( public.supervisor_same_dept_application_for_company(companies.id) );
