-- Training end scheduling + auto-complete when training_end_date is reached.
-- Manual "Mark completed" by company continues to work as before.

-- 1) Structured duration for scheduling (listing still keeps human-readable duration text)
alter table public.internship_positions
  add column if not exists duration_weeks integer;

alter table public.internship_positions
  drop constraint if exists internship_positions_duration_weeks_positive;

alter table public.internship_positions
  add constraint internship_positions_duration_weeks_positive
  check (duration_weeks is null or duration_weeks > 0);

-- Backfill from legacy "N weeks" text (leading digits only)
update public.internship_positions
set duration_weeks = (regexp_match(trim(duration), '^(\d+)'))[1]::integer
where duration_weeks is null
  and duration is not null
  and trim(duration) ~ '^\d+';

update public.internship_positions
set duration_weeks = null
where duration_weeks is not null and duration_weeks <= 0;

-- 2) Application training schedule (set when company accepts)
alter table public.applications
  add column if not exists accepted_at timestamptz;

alter table public.applications
  add column if not exists training_end_date date;

comment on column public.applications.accepted_at is 'When the company accepted this application (server/client sets on accept).';
comment on column public.applications.training_end_date is 'Last calendar day of scheduled training; inclusive auto-complete when CURRENT_DATE >= this date.';

-- 3) Auto-complete accepted placements whose scheduled end date has passed
create or replace function public.auto_complete_expired_trainings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  done int := 0;
begin
  for rec in
    select
      a.id as app_id,
      s.user_id,
      ip.title as internship_title,
      c.company_name
    from public.applications a
    inner join public.students s on s.id = a.student_id
    inner join public.internship_positions ip on ip.id = a.position_id
    inner join public.companies c on c.id = ip.company_id
    where a.status = 'accepted'
      and a.training_end_date is not null
      and a.training_end_date <= ((now() at time zone 'utc'))::date
  loop
    update public.applications
    set status = 'completed'
    where id = rec.app_id
      and status = 'accepted';

    if found then
      insert into public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        related_application_id
      )
      values (
        rec.user_id,
        'Internship completed',
        format(
          '✅ Your internship for %s at %s has ended as scheduled.',
          rec.internship_title,
          rec.company_name
        ),
        'training_completed',
        false,
        rec.app_id
      );

      done := done + 1;
    end if;
  end loop;

  return done;
end;
$$;

grant execute on function public.auto_complete_expired_trainings() to authenticated;
grant execute on function public.auto_complete_expired_trainings() to service_role;
