-- New company labeling + cached intelligent company statistics.
-- Weights (student feedback 40%, acceptance 30%, completion 15%, supervisor 10%, activity 5%)
-- are embedded in refresh_company_statistics for now; extract to config table later if needed.

alter table public.companies
  add column if not exists is_new_company boolean not null default true,
  add column if not exists evaluation_enabled boolean not null default false,
  add column if not exists total_offered_internships integer not null default 0,
  add column if not exists total_accepted_students integer not null default 0,
  add column if not exists acceptance_ratio numeric(7, 4) not null default 0,
  add column if not exists completed_internships integer not null default 0,
  add column if not exists completion_rate numeric(7, 4) not null default 0,
  add column if not exists average_student_rating numeric(7, 4),
  add column if not exists average_supervisor_rating numeric(7, 4),
  add column if not exists company_score numeric(7, 6) not null default 0,
  add column if not exists stats_updated_at timestamptz;

create or replace function public.refresh_company_statistics(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offered integer;
  v_accepted integer;
  v_completed integer;
  v_feedbacks bigint;
  v_avg_rating numeric;
  v_acceptance_ratio numeric;
  v_completion_rate numeric;
  v_student_feedback_score numeric;
  v_supervisor_score numeric := 0.5;
  v_activity_score numeric;
  v_company_score numeric;
  v_is_new boolean;
  v_eval_enabled boolean;
begin
  if p_company_id is null then
    return;
  end if;

  select count(*)::integer
  into v_offered
  from public.internship_positions ip
  where ip.company_id = p_company_id;

  select count(*)::integer
  into v_accepted
  from public.applications a
  inner join public.internship_positions ip on ip.id = a.position_id
  where ip.company_id = p_company_id
    and a.status in ('accepted', 'completed');

  select count(*)::integer
  into v_completed
  from public.applications a
  inner join public.internship_positions ip on ip.id = a.position_id
  where ip.company_id = p_company_id
    and a.status = 'completed';

  select
    count(*)::bigint,
    avg(
      (e.overall_rating + e.mentorship_rating + e.environment_rating + e.skills_rating) / 4.0
    )
  into v_feedbacks, v_avg_rating
  from public.student_training_evaluations e
  inner join public.applications a on a.id = e.application_id
  inner join public.internship_positions ip on ip.id = a.position_id
  where ip.company_id = p_company_id;

  v_acceptance_ratio :=
    case
      when v_offered > 0 then least(1.0, v_accepted::numeric / v_offered::numeric)
      else 0
    end;

  v_completion_rate :=
    case
      when v_accepted > 0 then least(1.0, v_completed::numeric / v_accepted::numeric)
      else 0
    end;

  v_student_feedback_score :=
    case
      when v_avg_rating is not null then least(1.0, v_avg_rating / 5.0)
      else 0
    end;

  v_activity_score := least(1.0, v_offered::numeric / 5.0);

  v_is_new := not (v_offered > 0 and v_accepted > 0);

  -- Public evaluation requires active participation plus minimum track record.
  v_eval_enabled := not v_is_new and (v_completed >= 3 or v_feedbacks >= 5);

  if v_eval_enabled then
    v_company_score :=
      0.40 * v_student_feedback_score
      + 0.30 * v_acceptance_ratio
      + 0.15 * v_completion_rate
      + 0.10 * v_supervisor_score
      + 0.05 * v_activity_score;
  else
    v_company_score := 0;
  end if;

  update public.companies
  set
    is_new_company = v_is_new,
    evaluation_enabled = v_eval_enabled,
    total_offered_internships = v_offered,
    total_accepted_students = v_accepted,
    acceptance_ratio = round(v_acceptance_ratio, 4),
    completed_internships = v_completed,
    completion_rate = round(v_completion_rate, 4),
    average_student_rating = case when v_avg_rating is not null then round(v_avg_rating, 2) else null end,
    average_supervisor_rating = null,
    company_score = round(v_company_score, 6),
    stats_updated_at = now()
  where id = p_company_id;
end;
$$;

grant execute on function public.refresh_company_statistics(uuid) to service_role;

create or replace function public.trg_refresh_company_stats_from_position()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_company_statistics(old.company_id);
    return old;
  end if;

  perform public.refresh_company_statistics(new.company_id);

  if tg_op = 'UPDATE' and old.company_id is distinct from new.company_id then
    perform public.refresh_company_statistics(old.company_id);
  end if;

  return new;
end;
$$;

create or replace function public.trg_refresh_company_stats_from_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if tg_op = 'DELETE' then
    select ip.company_id
    into v_company_id
    from public.internship_positions ip
    where ip.id = old.position_id;
  else
    select ip.company_id
    into v_company_id
    from public.internship_positions ip
    where ip.id = new.position_id;
  end if;

  if v_company_id is not null then
    perform public.refresh_company_statistics(v_company_id);
  end if;

  if tg_op = 'UPDATE' and old.position_id is distinct from new.position_id then
    select ip.company_id
    into v_company_id
    from public.internship_positions ip
    where ip.id = old.position_id;

    if v_company_id is not null then
      perform public.refresh_company_statistics(v_company_id);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.trg_refresh_company_stats_from_training_eval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application_id uuid;
  v_company_id uuid;
begin
  v_application_id := coalesce(new.application_id, old.application_id);

  if v_application_id is null then
    return coalesce(new, old);
  end if;

  select ip.company_id
  into v_company_id
  from public.applications a
  inner join public.internship_positions ip on ip.id = a.position_id
  where a.id = v_application_id;

  if v_company_id is not null then
    perform public.refresh_company_statistics(v_company_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_company_stats_internship_positions on public.internship_positions;
create trigger trg_company_stats_internship_positions
after insert or update or delete on public.internship_positions
for each row execute function public.trg_refresh_company_stats_from_position();

drop trigger if exists trg_company_stats_applications on public.applications;
create trigger trg_company_stats_applications
after insert or update or delete on public.applications
for each row execute function public.trg_refresh_company_stats_from_application();

drop trigger if exists trg_company_stats_training_evaluations on public.student_training_evaluations;
create trigger trg_company_stats_training_evaluations
after insert or update or delete on public.student_training_evaluations
for each row execute function public.trg_refresh_company_stats_from_training_eval();

create or replace function public.get_company_evaluation(p_company_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select
      coalesce(is_new_company, true) as is_new_company,
      coalesce(evaluation_enabled, false) as evaluation_enabled,
      coalesce(total_offered_internships, 0) as total_offered_internships,
      coalesce(total_accepted_students, 0) as total_accepted_students,
      coalesce(acceptance_ratio, 0) as acceptance_ratio,
      coalesce(completed_internships, 0) as completed_internships,
      coalesce(completion_rate, 0) as completion_rate,
      average_student_rating,
      coalesce(company_score, 0) as company_score
    from public.companies
    where id = p_company_id
  ),
  eval as (
    select
      count(*)::bigint as n,
      avg(
        (e.overall_rating + e.mentorship_rating + e.environment_rating + e.skills_rating) / 4.0
      ) as avg_rating
    from public.student_training_evaluations e
    inner join public.applications a on a.id = e.application_id
    inner join public.internship_positions ip on ip.id = a.position_id
    where ip.company_id = p_company_id
  )
  select json_build_object(
    'is_new_company', coalesce(c.is_new_company, true),
    'evaluation_enabled', coalesce(c.evaluation_enabled, false),
    'total_offered_internships', coalesce(c.total_offered_internships, 0),
    'total_accepted_students', coalesce(c.total_accepted_students, 0),
    'acceptance_ratio_pct',
      case
        when coalesce(c.evaluation_enabled, false)
          then round(coalesce(c.acceptance_ratio, 0) * 100, 1)
        else null
      end,
    'completed_internships', coalesce(c.completed_internships, 0),
    'completion_rate_pct',
      case
        when coalesce(c.evaluation_enabled, false)
          then round(coalesce(c.completion_rate, 0) * 100, 1)
        else null
      end,
    'avg_score',
      case
        when coalesce(c.evaluation_enabled, false)
          then round(coalesce(c.company_score, 0)::numeric, 6)
        else null
      end,
    'avg_rating',
      case
        when coalesce(c.evaluation_enabled, false) and c.average_student_rating is not null
          then round(c.average_student_rating::numeric, 6)
        when coalesce(c.evaluation_enabled, false) and eval.n > 0
          then round(eval.avg_rating::numeric, 6)
        else null
      end,
    'total_feedbacks', coalesce(eval.n, 0),
    'company_level',
      case
        when not coalesce(c.evaluation_enabled, false) then null::text
        when coalesce(c.company_score, 0) >= 0.6 then 'white'
        when coalesce(c.company_score, 0) >= 0.4 then 'gray'
        else 'black'
      end,
    'company_score',
      case
        when coalesce(c.evaluation_enabled, false)
          then round(coalesce(c.company_score, 0)::numeric, 6)
        else null
      end
  )
  from eval
  left join c on true;
$$;

grant execute on function public.get_company_evaluation(uuid) to authenticated;
grant execute on function public.get_company_evaluation(uuid) to service_role;

do $$
declare
  r record;
begin
  for r in select id from public.companies loop
    perform public.refresh_company_statistics(r.id);
  end loop;
end;
$$;
