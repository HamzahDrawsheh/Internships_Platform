-- Application deadline: last day students may apply. Past deadline → listing treated as expired.

alter table public.internship_positions
  add column if not exists application_deadline date;

comment on column public.internship_positions.application_deadline is
  'Last calendar day students can apply. After this date the listing is expired (typically same as start_date).';

-- Backfill from internship start when missing
update public.internship_positions
set application_deadline = start_date
where application_deadline is null
  and start_date is not null;

alter table public.internship_positions
  drop constraint if exists internship_positions_application_deadline_before_start;

alter table public.internship_positions
  add constraint internship_positions_application_deadline_before_start
  check (
    application_deadline is null
    or start_date is null
    or application_deadline <= start_date
  );

create or replace function public.expire_internship_application_deadlines()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  update public.internship_positions
  set is_active = false
  where is_active = true
    and application_deadline is not null
    and application_deadline < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_internship_application_deadlines() from public;
grant execute on function public.expire_internship_application_deadlines() to authenticated, service_role;
