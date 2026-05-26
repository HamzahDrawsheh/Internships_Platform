-- Anonymized student feedback list for company public profiles.
-- SECURITY DEFINER: RLS on student_training_evaluations / ratings hides peer rows from students.

create or replace function public.get_company_student_feedbacks(p_company_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with training as (
    select
      e.id,
      'training'::text as source,
      e.overall_rating,
      e.mentorship_rating,
      e.environment_rating,
      e.skills_rating,
      e.would_recommend,
      e.other_notes,
      e.created_at,
      round(
        (e.overall_rating + e.mentorship_rating + e.environment_rating + e.skills_rating) / 4.0,
        1
      ) as avg_rating
    from public.student_training_evaluations e
    inner join public.applications a on a.id = e.application_id
    inner join public.internship_positions ip on ip.id = a.position_id
    where ip.company_id = p_company_id
  ),
  legacy as (
    select
      r.id,
      'legacy'::text as source,
      r.rating as overall_rating,
      null::integer as mentorship_rating,
      null::integer as environment_rating,
      null::integer as skills_rating,
      null::boolean as would_recommend,
      r.feedback as other_notes,
      r.created_at,
      r.rating::numeric as avg_rating
    from public.ratings r
    where r.company_id = p_company_id
  ),
  combined as (
    select * from training
    union all
    select * from legacy
  )
  select coalesce(
    (
      select json_agg(
        json_build_object(
          'id', c.id,
          'source', c.source,
          'overall_rating', c.overall_rating,
          'mentorship_rating', c.mentorship_rating,
          'environment_rating', c.environment_rating,
          'skills_rating', c.skills_rating,
          'would_recommend', c.would_recommend,
          'other_notes', c.other_notes,
          'avg_rating', c.avg_rating,
          'created_at', c.created_at
        )
        order by c.created_at desc
      )
      from combined c
    ),
    '[]'::json
  );
$$;

comment on function public.get_company_student_feedbacks(uuid) is
  'Returns anonymized student training evaluations and legacy ratings for a company profile.';

revoke all on function public.get_company_student_feedbacks(uuid) from public;
grant execute on function public.get_company_student_feedbacks(uuid) to authenticated;
grant execute on function public.get_company_student_feedbacks(uuid) to service_role;

-- Ensure new company rows always refresh cached stats (is_new_company defaults true).
create or replace function public.trg_refresh_company_stats_on_company_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_company_statistics(new.id);
  return new;
end;
$$;

drop trigger if exists trg_company_stats_companies_insert on public.companies;
create trigger trg_company_stats_companies_insert
after insert on public.companies
for each row execute function public.trg_refresh_company_stats_on_company_insert();
