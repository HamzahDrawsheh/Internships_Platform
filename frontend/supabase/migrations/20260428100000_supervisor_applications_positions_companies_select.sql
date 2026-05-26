-- Supervisors: read applications for students in the same department, and read
-- internship_positions + companies rows needed for nested selects / joins.

drop policy if exists "applications_select_assigned_supervisor_students" on public.applications;
drop policy if exists "Supervisors can view applications of same department students" on public.applications;

create policy "Supervisors can view applications of same department students"
on public.applications
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    join public.supervisors sup on sup.user_id = auth.uid()
    where s.id = applications.student_id
      and lower(trim(s.department)) = lower(trim(sup.department))
  )
);

drop policy if exists "internship_positions_select_supervisor_same_department_applications"
  on public.internship_positions;

create policy "internship_positions_select_supervisor_same_department_applications"
on public.internship_positions
for select
to authenticated
using (
  exists (
    select 1
    from public.applications app
    join public.students s on s.id = app.student_id
    join public.supervisors sup on sup.user_id = auth.uid()
    where app.position_id = internship_positions.id
      and lower(trim(s.department)) = lower(trim(sup.department))
  )
);

drop policy if exists "companies_select_supervisor_same_department_applications" on public.companies;

create policy "companies_select_supervisor_same_department_applications"
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.internship_positions pos
    join public.applications app on app.position_id = pos.id
    join public.students s on s.id = app.student_id
    join public.supervisors sup on sup.user_id = auth.uid()
    where pos.company_id = companies.id
      and lower(trim(s.department)) = lower(trim(sup.department))
  )
);
