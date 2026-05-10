-- =========================================================
-- Fix infinite RLS recursion (42P17) between students ↔ supervisors
-- =========================================================
-- Chain that broke login/profile reads after messaging policies were added:
--   profiles EXISTS(subquery on students)
--     → students_select_assigned_supervisor scans supervisors
--       → supervisors_select_for_matching_students EXISTS(subquery on students)
--         → students policies … → supervisors … → infinite recursion
--
-- Resolution: evaluate “student may see this supervisor row” inside a
-- SECURITY DEFINER helper so nested reads on students/supervisors do not
-- re-enter each other’s RLS policies.

create or replace function public.student_can_see_supervisor_row_for_matching(p_supervisor_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.id = p_supervisor_row_id
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

grant execute on function public.student_can_see_supervisor_row_for_matching(uuid) to authenticated;

drop policy if exists "supervisors_select_for_matching_students" on public.supervisors;
create policy "supervisors_select_for_matching_students"
on public.supervisors
for select
to authenticated
using (public.student_can_see_supervisor_row_for_matching(supervisors.id));
