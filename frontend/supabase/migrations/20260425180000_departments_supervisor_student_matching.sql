-- Academic departments (canonical list) + student/supervisor department enforcement,
-- department-based supervisor access (RLS), view column, and optional supervisor_id sync.
--
-- Data safety: existing NULL/invalid department values are set to 'Computer Science'.
-- Review and UPDATE manually if that default is wrong for your org.
-- After deploy: npm run supabase:push (from frontend/)

-- 1) Shared validation (must stay in sync with frontend lib/departments.ts)
create or replace function public.is_valid_academic_department(d text)
returns boolean
language sql
immutable
as $$
  select d is not null
    and d in (
      'Computer Science',
      'Software Engineering',
      'Information Technology',
      'Cyber Security',
      'Data Science',
      'Artificial Intelligence'
    );
$$;

-- 2) Students: add department, backfill, constrain, require
alter table if exists public.students
  add column if not exists department text;

update public.students
set department = 'Computer Science'
where department is null;

alter table public.students
  drop constraint if exists students_department_valid;

alter table public.students
  add constraint students_department_valid
  check (public.is_valid_academic_department(department));

alter table public.students
  alter column department set not null;

create index if not exists idx_students_department on public.students (department);

-- 3) Supervisors: normalize free-text / null, constrain, require
update public.supervisors
set department = 'Computer Science'
where department is null
   or trim(department) = ''
   or not public.is_valid_academic_department(department);

alter table public.supervisors
  drop constraint if exists supervisors_department_valid;

alter table public.supervisors
  add constraint supervisors_department_valid
  check (public.is_valid_academic_department(department));

alter table public.supervisors
  alter column department set not null;

-- 4) RLS helpers: same department as logged-in supervisor (not supervisor_id)
create or replace function public.supervisor_assigned_student(student_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.supervisors sup
      on sup.user_id = auth.uid()
     and sup.department = s.department
    where s.id = student_row_id
  );
$$;

create or replace function public.supervisor_can_read_profile(profile_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.supervisors sup
      on sup.user_id = auth.uid()
     and sup.department = s.department
    where s.user_id = profile_row_id
  );
$$;

-- 5) Supervisors can read student_additional_info for same-department students
drop policy if exists "student_additional_info_select_supervisor_same_department" on public.student_additional_info;
create policy "student_additional_info_select_supervisor_same_department"
on public.student_additional_info
for select
using (
  exists (
    select 1
    from public.students s
    join public.supervisors sup
      on sup.user_id = auth.uid()
     and sup.department = s.department
    where s.user_id = student_additional_info.user_id
  )
);

-- 6) Application / student detail view: expose student department
drop view if exists public.v_application_student_details;

create view public.v_application_student_details as
select
  a.id as application_id,
  s.id as student_id,
  p.id as student_user_id,
  p.full_name as student_name,
  p.email,
  s.university,
  s.major,
  s.department as student_department,
  coalesce((regexp_match(coalesce(s.preferences, ''), '"year"\s*:\s*"([^"]*)"'))[1], '—') as year,
  coalesce((regexp_match(coalesce(s.preferences, ''), '"bio"\s*:\s*"([^"]*)"'))[1], nullif(s.preferences, ''), '—') as bio,
  s.cv_url,
  ip.title as internship_title,
  a.applied_at,
  a.status as application_status,
  c.user_id as company_user_id,
  sup.user_id as supervisor_user_id,
  sai.gpa,
  sai.technical_skills,
  sai.taken_courses
from public.applications a
join public.students s
  on s.id = a.student_id
join public.profiles p
  on p.id = s.user_id
left join public.internship_positions ip
  on ip.id = a.position_id
left join public.companies c
  on c.id = ip.company_id
left join public.supervisors sup
  on sup.id = s.supervisor_id
left join public.student_additional_info sai
  on sai.user_id = p.id;

-- 7) Keep supervisor_id aligned for reporting (oldest supervisor in department wins on student writes)
create or replace function public.trg_set_student_supervisor_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.supervisor_id := (
    select sup.id
    from public.supervisors sup
    where sup.department = new.department
    order by sup.created_at asc nulls last
    limit 1
  );
  return new;
end;
$$;

drop trigger if exists trg_students_set_supervisor_id on public.students;
create trigger trg_students_set_supervisor_id
before insert or update of department on public.students
for each row
execute function public.trg_set_student_supervisor_id();

-- 8) When a supervisor row appears or department changes, attach unassigned students in that department
create or replace function public.trg_supervisor_link_students()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.students s
  set supervisor_id = new.id
  where s.department = new.department
    and s.supervisor_id is null;
  return new;
end;
$$;

drop trigger if exists trg_supervisors_link_students on public.supervisors;
create trigger trg_supervisors_link_students
after insert or update of department on public.supervisors
for each row
execute function public.trg_supervisor_link_students();
