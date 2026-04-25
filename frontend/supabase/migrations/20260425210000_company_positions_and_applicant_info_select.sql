-- Let companies read their own internship rows (including inactive) for ownership checks and joins.
-- Previously only positions_select_active (public active listings) applied; inactive rows were invisible
-- to the company user under RLS, breaking application flows that join internship_positions.

drop policy if exists "positions_select_own_company" on public.internship_positions;
create policy "positions_select_own_company"
on public.internship_positions
for select
using (
  exists (
    select 1
    from public.companies c
    where c.id = internship_positions.company_id
      and c.user_id = auth.uid()
  )
);

-- Companies can read student_additional_info for users who applied to that company's internships.
drop policy if exists "student_additional_info_select_company_applicants" on public.student_additional_info;
create policy "student_additional_info_select_company_applicants"
on public.student_additional_info
for select
using (
  exists (
    select 1
    from public.students s
    join public.applications app on app.student_id = s.id
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where s.user_id = student_additional_info.user_id
      and c.user_id = auth.uid()
  )
);
