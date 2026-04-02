-- Company applicant visibility hardening (idempotent)
-- Goal: let a company read applications and applicant student/profile data
-- only for internships owned by that same company.

-- Ensure RLS is enabled on relevant tables.
alter table if exists public.applications enable row level security;
alter table if exists public.students enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.internship_positions enable row level security;
alter table if exists public.companies enable row level security;

-- Applications: company can read only applications for its own internship positions.
drop policy if exists "applications_select_company_positions" on public.applications;
create policy "applications_select_company_positions"
on public.applications
for select
using (
  exists (
    select 1
    from public.internship_positions pos
    join public.companies c on c.id = pos.company_id
    where pos.id = applications.position_id
      and c.user_id = auth.uid()
  )
);

-- Students: company can read students only if they applied to one of company's positions.
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

-- Profiles: company can read applicant profile rows (e.g., full_name)
-- only when linked to student applicants for company's positions.
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
