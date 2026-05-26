-- Internship listing schedule dates + optional notes for applicants.

alter table public.internship_positions
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists additional_notes text;

alter table public.internship_positions
  drop constraint if exists internship_positions_end_after_start;

alter table public.internship_positions
  add constraint internship_positions_end_after_start
  check (start_date is null or end_date is null or end_date >= start_date);

comment on column public.internship_positions.start_date is 'Planned internship start date shown to students.';
comment on column public.internship_positions.end_date is 'Planned internship end date shown to students.';
comment on column public.internship_positions.additional_notes is 'Optional extra info for applicants (schedule, perks, etc.).';
