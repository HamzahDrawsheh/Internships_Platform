-- Map legacy / short department labels to the canonical six values (must match lib/departments.ts
-- and public.is_valid_academic_department). Re-applies CHECK constraints after data fix.
--
-- Safe order: drop CHECKs → normalize → re-add CHECKs.

-- 1) Normalize any string to one of the six canonical names (unknown → Computer Science).
create or replace function public.canonical_academic_department(raw text)
returns text
language sql
immutable
as $$
  with t as (
    select lower(regexp_replace(trim(coalesce(raw, '')), '\s+', ' ', 'g')) as k
  )
  select case (select k from t)
    when 'computer science' then 'Computer Science'
    when 'software engineering' then 'Software Engineering'
    when 'information technology' then 'Information Technology'
    when 'cyber security' then 'Cyber Security'
    when 'data science' then 'Data Science'
    when 'artificial intelligence' then 'Artificial Intelligence'
    when 'cs' then 'Computer Science'
    when 'c.s' then 'Computer Science'
    when 'c.s.' then 'Computer Science'
    when 'comp sci' then 'Computer Science'
    when 'comp-sci' then 'Computer Science'
    when 'compscience' then 'Computer Science'
    when 'computing science' then 'Computer Science'
    when 'se' then 'Software Engineering'
    when 'swe' then 'Software Engineering'
    when 'sw eng' then 'Software Engineering'
    when 'software eng' then 'Software Engineering'
    when 'it' then 'Information Technology'
    when 'i.t' then 'Information Technology'
    when 'i.t.' then 'Information Technology'
    when 'info tech' then 'Information Technology'
    when 'infotech' then 'Information Technology'
    when 'cybersecurity' then 'Cyber Security'
    when 'cyber' then 'Cyber Security'
    when 'infosec' then 'Cyber Security'
    when 'information security' then 'Cyber Security'
    when 'ds' then 'Data Science'
    when 'data-science' then 'Data Science'
    when 'ai' then 'Artificial Intelligence'
    when 'a.i' then 'Artificial Intelligence'
    when 'a.i.' then 'Artificial Intelligence'
    else 'Computer Science'
  end;
$$;

-- 2) Relax CHECKs while rewriting values.
alter table public.supervisors drop constraint if exists supervisors_department_valid;
alter table public.students drop constraint if exists students_department_valid;

update public.supervisors
set department = public.canonical_academic_department(department);

update public.students
set department = public.canonical_academic_department(department);

-- 3) Supervisor onboarding payloads (if table exists).
do $$
begin
  if to_regclass('public.role_upgrade_requests') is not null then
    update public.role_upgrade_requests r
    set payload = jsonb_set(
      coalesce(r.payload, '{}'::jsonb),
      '{department}',
      to_jsonb(public.canonical_academic_department(coalesce(r.payload->>'department', ''))),
      true
    )
    where r.requested_role = 'supervisor'
      and coalesce(r.payload->>'department', '') <> ''
      and not public.is_valid_academic_department(r.payload->>'department');
  end if;
end;
$$;

-- 4) Re-apply CHECK constraints (same definitions as prior migration).
alter table public.students
  add constraint students_department_valid
  check (public.is_valid_academic_department(department));

alter table public.supervisors
  add constraint supervisors_department_valid
  check (public.is_valid_academic_department(department));

-- 5) Keep values canonical on every write (defense in depth).
create or replace function public.trg_normalize_department_column()
returns trigger
language plpgsql
as $$
begin
  if new.department is not null then
    new.department := public.canonical_academic_department(new.department);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_supervisors_normalize_department on public.supervisors;
create trigger trg_supervisors_normalize_department
before insert or update of department on public.supervisors
for each row
execute function public.trg_normalize_department_column();

drop trigger if exists trg_students_normalize_department on public.students;
create trigger trg_students_normalize_department
before insert or update of department on public.students
for each row
execute function public.trg_normalize_department_column();
