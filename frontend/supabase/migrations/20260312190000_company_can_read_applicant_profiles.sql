-- Allow company users to read student records and profile names
-- for students who applied to internships owned by that company.

drop policy if exists "students_select_company_applicants" on public.students;
create policy "students_select_company_applicants"
on public.students
for select
using (
  exists (
    select 1
    from public.applications app
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where app.student_id = students.id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "profiles_select_company_applicant_profiles" on public.profiles;
create policy "profiles_select_company_applicant_profiles"
on public.profiles
for select
using (
  exists (
    select 1
    from public.students s
    join public.applications app on app.student_id = s.id
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where s.user_id = profiles.id
      and c.user_id = auth.uid()
  )
);
