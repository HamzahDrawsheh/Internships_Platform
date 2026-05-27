-- Reduce direct caller surface for batch maintenance and notification creation.
-- Client-side maintenance calls are now best-effort fallbacks; scheduled jobs use
-- the service role through /api/cron/maintenance.

revoke execute on function public.auto_complete_expired_trainings() from authenticated;
grant execute on function public.auto_complete_expired_trainings() to service_role;

revoke execute on function public.expire_stale_application_commitments() from authenticated;
grant execute on function public.expire_stale_application_commitments() to service_role;

revoke execute on function public.backfill_internships_from_applications(boolean) from authenticated;
grant execute on function public.backfill_internships_from_applications(boolean) to service_role;

revoke execute on function public.create_platform_notification(uuid, text, text, text, uuid, uuid, uuid, text) from authenticated;
grant execute on function public.create_platform_notification(uuid, text, text, text, uuid, uuid, uuid, text) to service_role;

-- Keep read-only company intelligence callable by authenticated clients for
-- public company/profile UI, but remove note text from the feedback list so
-- arbitrary callers cannot mine free-form student comments through the RPC.
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
      null::text as other_notes,
      e.created_at,
      round(
        (e.overall_rating + e.mentorship_rating + e.environment_rating + e.skills_rating) / 4.0,
        1
      ) as avg_rating
    from public.student_training_evaluations e
    inner join public.applications a on a.id = e.application_id
    inner join public.internship_positions ip on ip.id = a.position_id
    where ip.company_id = p_company_id
      and not coalesce(e.is_hidden, false)
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
      null::text as other_notes,
      r.created_at,
      r.rating::numeric as avg_rating
    from public.ratings r
    where r.company_id = p_company_id
      and not coalesce(r.is_hidden, false)
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

revoke all on function public.get_company_student_feedbacks(uuid) from public;
grant execute on function public.get_company_student_feedbacks(uuid) to authenticated;
grant execute on function public.get_company_student_feedbacks(uuid) to service_role;
