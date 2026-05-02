-- Company evaluation aggregate from student_training_evaluations only (no AI, no feedback_analysis).
-- SECURITY DEFINER: RLS on student_training_evaluations would hide rows from invokers; only aggregates are returned.

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
        else round((s.avg_rating / 5.0)::numeric, 6)
      end,
    'avg_rating',
      case
        when s.n = 0 then null
        else round(s.avg_rating::numeric, 6)
      end,
    'total_feedbacks', s.n,
    'company_level',
      case
        when s.n = 0 then null::text
        when (s.avg_rating / 5.0) >= 0.6 then 'white'
        when (s.avg_rating / 5.0) >= 0.4 then 'gray'
        else 'black'
      end
  )
  from (
    select
      count(*)::bigint as n,
      avg(
        (e.overall_rating + e.mentorship_rating + e.environment_rating + e.skills_rating) / 4.0
      ) as avg_rating
    from public.student_training_evaluations e
    inner join public.applications a on a.id = e.application_id
    inner join public.internship_positions ip on ip.id = a.position_id
    where ip.company_id = p_company_id
  ) s;
$$;

grant execute on function public.get_company_evaluation(uuid) to authenticated;
grant execute on function public.get_company_evaluation(uuid) to service_role;
