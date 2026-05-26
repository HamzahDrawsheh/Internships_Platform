-- Read-only aggregate of AI-analyzed training feedback (feedback_analysis) per supervisor department.
-- SECURITY DEFINER: scope enforced inside; returns aggregates only (no raw feedback text).

create or replace function public.get_supervisor_department_ai_summary()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_department text;
begin
  if auth.uid() is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'supervisor'
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select sup.department into v_department
  from public.supervisors sup
  where sup.user_id = auth.uid()
  limit 1;

  if v_department is null or length(trim(v_department)) = 0 then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return (
    with filtered as (
      select fa.overall_score, fa.sentiment, fa.keywords
      from public.feedback_analysis fa
      inner join public.student_training_evaluations ste on ste.id = fa.feedback_id
      inner join public.applications app on app.id = ste.application_id
      inner join public.students s on s.id = app.student_id
      where s.department = v_department
    ),
    agg as (
      select
        count(*)::bigint as total_feedbacks,
        avg(overall_score)::double precision as avg_score,
        count(*) filter (where sentiment = 'positive')::bigint as positive,
        count(*) filter (where sentiment = 'neutral')::bigint as neutral,
        count(*) filter (where sentiment = 'negative')::bigint as negative
      from filtered
    ),
    kw_flat as (
      select distinct trim(both from lower(x)) as kw
      from filtered,
      lateral unnest(coalesce(filtered.keywords, array[]::text[])) as x
      where length(trim(both from x)) > 0
    ),
    kw_limited as (
      select kw from kw_flat order by kw limit 40
    ),
    kw_agg as (
      select coalesce(array_agg(kw order by kw), array[]::text[]) as keywords
      from kw_limited
    )
    select json_build_object(
      'total_feedbacks', coalesce((select total_feedbacks from agg), 0),
      'avg_score', (select avg_score from agg),
      'positive', coalesce((select positive from agg), 0),
      'neutral', coalesce((select neutral from agg), 0),
      'negative', coalesce((select negative from agg), 0),
      'keywords', coalesce((select keywords from kw_agg), array[]::text[])
    )
  );
end;
$$;

comment on function public.get_supervisor_department_ai_summary() is
  'Aggregates feedback_analysis for students in the caller supervisor department; profiles.role must be supervisor; returns aggregates only.';

revoke all on function public.get_supervisor_department_ai_summary() from public;
grant execute on function public.get_supervisor_department_ai_summary() to authenticated;
