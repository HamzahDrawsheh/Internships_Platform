-- Supervisor profile: university and office location
alter table public.supervisors
  add column if not exists university text,
  add column if not exists office_location text;

comment on column public.supervisors.university is 'University the supervisor is affiliated with';
comment on column public.supervisors.office_location is 'Campus office or room location for student meetings';
