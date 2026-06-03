-- Students enrolled on a listing must read its title even when is_active = false (deadline passed, paused, etc.).
-- Without this, nested selects on internship_positions return null and dashboards show "Internship".

drop policy if exists "internship_positions_select_student_own_applications" on public.internship_positions;

create policy "internship_positions_select_student_own_applications"
on public.internship_positions
for select
using (
  exists (
    select 1
    from public.applications a
    join public.students s on s.id = a.student_id
    where a.position_id = internship_positions.id
      and s.user_id = auth.uid()
  )
);
