-- Allow supervisors to read profiles of students in the same department (full_name, email for detail UIs).
-- Replaces the older policy that relied on supervisor_can_read_profile() (nested scans could block reads).

drop policy if exists "profiles_select_assigned_supervisor_students" on public.profiles;
drop policy if exists "Supervisors can view profiles of students in same department" on public.profiles;

create policy "Supervisors can view profiles of students in same department"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.user_id = auth.uid()
    where s.user_id = profiles.id
      and lower(trim(s.department)) = lower(trim(sup.department))
  )
);
