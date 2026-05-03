-- Read-only aggregate of AI-analyzed training feedback (feedback_analysis) per company.
-- SECURITY DEFINER: callers cannot bypass join filters; authorization enforced inside.

create or replace function public.get_company_feedback_ai_summary(p_company_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_company_id is null then
    raise exception 'invalid company id' using errcode = '22004';
  end if;

  if not (
    public.is_admin_user()
    or exists (
      select 1
      from public.companies c
      where c.id = p_company_id
        and c.user_id = auth.uid()
    )
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return (
    with filtered as (
      select fa.overall_score, fa.sentiment, fa.keywords
      from public.feedback_analysis fa
      inner join public.student_training_evaluations ste on ste.id = fa.feedback_id
      inner join public.applications app on app.id = ste.application_id
      inner join public.internship_positions ip on ip.id = app.position_id
      where ip.company_id = p_company_id
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

comment on function public.get_company_feedback_ai_summary(uuid) is
  'Aggregates feedback_analysis rows linked to company internships; allowed for admin or owning company user only.';

revoke all on function public.get_company_feedback_ai_summary(uuid) from public;
grant execute on function public.get_company_feedback_ai_summary(uuid) to authenticated;
