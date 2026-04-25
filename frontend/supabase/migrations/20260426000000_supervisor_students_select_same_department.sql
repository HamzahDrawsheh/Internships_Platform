-- Fix supervisors reading students in the same department.
-- Policy "students_select_assigned_supervisor" must NOT call a helper that SELECTs from
-- public.students again (RLS re-evaluates students policies → false or recursion).
-- This version only reads public.supervisors (allowed via supervisors_select_own).

drop policy if exists "students_select_assigned_supervisor" on public.students;

create policy "students_select_assigned_supervisor"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.supervisors sup
    where sup.user_id = auth.uid()
      and lower(trim(sup.department)) = lower(trim(students.department))
  )
);
