-- Supervisors: read student_additional_info for students in the same department (trim/case-safe).
-- Replaces the earlier same-name policy to match supervisor↔student department checks used elsewhere.

drop policy if exists "student_additional_info_select_supervisor_same_department" on public.student_additional_info;

create policy "student_additional_info_select_supervisor_same_department"
on public.student_additional_info
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.user_id = auth.uid()
    where s.user_id = student_additional_info.user_id
      and lower(trim(s.department)) = lower(trim(sup.department))
  )
);
