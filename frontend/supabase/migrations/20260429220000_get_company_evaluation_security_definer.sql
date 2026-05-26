-- Aggregated company evaluation only (avg_score, total_feedbacks, company_level).
-- SECURITY DEFINER: RLS on feedback_analysis / student_training_evaluations would hide rows from
-- callers using SECURITY INVOKER; aggregates must run with definer rights. No raw feedback text,
-- notes, student identifiers, or row-level fields are returned.

create or replace function public.get_company_evaluation(p_company_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'avg_score',
      case
        when s.n = 0 then null
        else round(s.avg_overall::numeric, 6)
      end,
    'total_feedbacks', s.n,
    'company_level',
      case
        when s.n = 0 then null::text
        when s.avg_overall >= 0.6 then 'white'
        when s.avg_overall >= 0.4 then 'gray'
        else 'black'
      end
  )
  from (
    select
      count(*)::bigint as n,
      avg(fa.overall_score) as avg_overall
    from public.feedback_analysis fa
    inner join public.student_training_evaluations ste on ste.id = fa.feedback_id
    inner join public.applications app on app.id = ste.application_id
    inner join public.internship_positions ip on ip.id = app.position_id
    where ip.company_id = p_company_id
  ) s;
$$;

grant execute on function public.get_company_evaluation(uuid) to authenticated;
grant execute on function public.get_company_evaluation(uuid) to service_role;
