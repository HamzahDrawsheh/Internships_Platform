-- Single source of three departments — must match frontend lib/departments.ts (ACADEMIC_DEPARTMENTS).
-- Replaces the prior six-department set. Remaps existing rows via canonical_academic_department; does not delete.

create or replace function public.is_valid_academic_department(d text)
returns boolean
language sql
immutable
as $$
  select d is not null
    and d in (
      'Computer Science',
      'Computer Information Systems',
      'Software Engineering'
    );
$$;

create or replace function public.canonical_academic_department(raw text)
returns text
language sql
immutable
as $$
  with t as (
    select lower(regexp_replace(trim(coalesce(raw, '')), '\s+', ' ', 'g')) as k
  )
  select case (select k from t)
    when 'computer information systems' then 'Computer Information Systems'
    when 'computer information system' then 'Computer Information Systems'
    when 'comp info systems' then 'Computer Information Systems'
    when 'comp info system' then 'Computer Information Systems'
    when 'computer science' then 'Computer Science'
    when 'software engineering' then 'Software Engineering'
    when 'information technology' then 'Computer Information Systems'
    when 'cyber security' then 'Computer Science'
    when 'data science' then 'Computer Science'
    when 'artificial intelligence' then 'Computer Science'
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
    when 'cis' then 'Computer Information Systems'
    when 'c.i.s' then 'Computer Information Systems'
    when 'c.i.s.' then 'Computer Information Systems'
    when 'it' then 'Computer Information Systems'
    when 'i.t' then 'Computer Information Systems'
    when 'i.t.' then 'Computer Information Systems'
    when 'info tech' then 'Computer Information Systems'
    when 'info systems' then 'Computer Information Systems'
    when 'information systems' then 'Computer Information Systems'
    when 'infotech' then 'Computer Information Systems'
    when 'cybersecurity' then 'Computer Science'
    when 'cyber' then 'Computer Science'
    when 'infosec' then 'Computer Science'
    when 'information security' then 'Computer Science'
    when 'ds' then 'Computer Science'
    when 'data-science' then 'Computer Science'
    when 'ai' then 'Computer Science'
    when 'a.i' then 'Computer Science'
    when 'a.i.' then 'Computer Science'
    else 'Computer Science'
  end;
$$;

-- Relax CHECK, normalize existing rows, re-apply.
alter table public.supervisors drop constraint if exists supervisors_department_valid;
alter table public.students drop constraint if exists students_department_valid;

update public.supervisors
set department = public.canonical_academic_department(department);

update public.students
set department = public.canonical_academic_department(department);

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

alter table public.students
  add constraint students_department_valid
  check (public.is_valid_academic_department(department));

alter table public.supervisors
  add constraint supervisors_department_valid
  check (public.is_valid_academic_department(department));
