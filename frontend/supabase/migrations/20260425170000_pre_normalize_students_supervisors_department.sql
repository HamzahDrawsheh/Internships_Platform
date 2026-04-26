-- =========================================================
-- Pre-normalization for department values before constraints
-- Runs before 20260425180000_departments_supervisor_student_matching.sql
-- =========================================================
-- Notes:
-- - Uses explicit CASE only (no dependency on later functions).
-- - Drops old/new department constraints first to allow normalization safely.
-- - Unknown / null / blank values are mapped to 'Computer Science'.
-- - Targets both students.department and supervisors.department.

alter table public.students drop constraint if exists check_department;
alter table public.supervisors drop constraint if exists check_department;
alter table public.students drop constraint if exists students_department_valid;
alter table public.supervisors drop constraint if exists supervisors_department_valid;

update public.students
set department = case
  when department is null then 'Computer Science'
  when btrim(department) = '' then 'Computer Science'
  when lower(btrim(department)) in ('cs', 'c.s', 'c.s.', 'computer science') then 'Computer Science'
  when lower(btrim(department)) in (
    'cis',
    'c.i.s',
    'c.i.s.',
    'it',
    'i.t',
    'i.t.',
    'information technology',
    'computer information systems',
    'computer information system'
  ) then 'Information Technology'
  when lower(btrim(department)) in ('se', 'swe', 'software engineering') then 'Software Engineering'
  when lower(btrim(department)) in ('ai', 'a.i', 'a.i.', 'artificial intelligence') then 'Artificial Intelligence'
  when lower(btrim(department)) in ('ds', 'data science', 'data-science') then 'Data Science'
  when lower(btrim(department)) in ('cyber', 'cyber security', 'cybersecurity') then 'Cyber Security'
  else 'Computer Science'
end;

update public.supervisors
set department = case
  when department is null then 'Computer Science'
  when btrim(department) = '' then 'Computer Science'
  when lower(btrim(department)) in ('cs', 'c.s', 'c.s.', 'computer science') then 'Computer Science'
  when lower(btrim(department)) in (
    'cis',
    'c.i.s',
    'c.i.s.',
    'it',
    'i.t',
    'i.t.',
    'information technology',
    'computer information systems',
    'computer information system'
  ) then 'Information Technology'
  when lower(btrim(department)) in ('se', 'swe', 'software engineering') then 'Software Engineering'
  when lower(btrim(department)) in ('ai', 'a.i', 'a.i.', 'artificial intelligence') then 'Artificial Intelligence'
  when lower(btrim(department)) in ('ds', 'data science', 'data-science') then 'Data Science'
  when lower(btrim(department)) in ('cyber', 'cyber security', 'cybersecurity') then 'Cyber Security'
  else 'Computer Science'
end;
