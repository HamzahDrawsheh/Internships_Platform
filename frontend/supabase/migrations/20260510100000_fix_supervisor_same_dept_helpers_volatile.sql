-- PostgreSQL rejects SET / SET LOCAL inside STABLE or IMMUTABLE functions (SQLSTATE 0A000).
-- supervisor_same_dept_application_for_position / _for_company used SET LOCAL row_security
-- while marked STABLE, which broke supervisor reads that touch internship_positions (e.g. nested
-- selects from applications).

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
