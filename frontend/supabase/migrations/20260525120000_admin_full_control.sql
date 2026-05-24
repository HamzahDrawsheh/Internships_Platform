-- Admin full control: suspend users, hide feedback, moderate listings, analytics, fix onboarding approve.

-- ---------------------------------------------------------------------------
-- 1) Moderation columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_suspended boolean not null default false;

alter table public.student_training_evaluations
  add column if not exists is_hidden boolean not null default false;

alter table public.ratings
  add column if not exists is_hidden boolean not null default false;

create index if not exists idx_profiles_is_suspended on public.profiles (is_suspended) where is_suspended = true;
create index if not exists idx_ste_is_hidden on public.student_training_evaluations (is_hidden) where is_hidden = true;

-- Admin read training evaluations + ratings
drop policy if exists "student_training_evaluations_select_admin" on public.student_training_evaluations;
create policy "student_training_evaluations_select_admin"
on public.student_training_evaluations
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "ratings_select_admin" on public.ratings;
create policy "ratings_select_admin"
on public.ratings
for select
to authenticated
using (public.is_admin_user());

-- Admin update profiles (suspend / role) via RPC; allow direct update for admin too
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "internship_positions_update_admin" on public.internship_positions;
create policy "internship_positions_update_admin"
on public.internship_positions
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "applications_update_admin" on public.applications;
create policy "applications_update_admin"
on public.applications
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- ---------------------------------------------------------------------------
-- 2) Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot suspend yourself' using errcode = 'P0001';
  end if;
  update public.profiles
  set is_suspended = coalesce(p_suspended, false), updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_role not in ('student', 'company', 'supervisor', 'admin') then
    raise exception 'invalid role' using errcode = 'P0001';
  end if;
  if p_user_id = auth.uid() and p_role is distinct from 'admin' then
    raise exception 'cannot demote yourself' using errcode = 'P0001';
  end if;
  update public.profiles
  set role = p_role, updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.admin_set_training_feedback_hidden(p_feedback_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select ip.company_id
  into v_company_id
  from public.student_training_evaluations ste
  join public.applications a on a.id = ste.application_id
  join public.internship_positions ip on ip.id = a.position_id
  where ste.id = p_feedback_id;

  if not found then
    raise exception 'feedback not found' using errcode = 'P0001';
  end if;

  update public.student_training_evaluations
  set is_hidden = coalesce(p_hidden, false)
  where id = p_feedback_id;

  if v_company_id is not null then
    perform public.refresh_company_statistics(v_company_id);
  end if;
end;
$$;

create or replace function public.admin_set_rating_hidden(p_rating_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.ratings
  set is_hidden = coalesce(p_hidden, false)
  where id = p_rating_id
  returning company_id into v_company_id;
  if not found then
    raise exception 'rating not found' using errcode = 'P0001';
  end if;
  if v_company_id is not null then
    perform public.refresh_company_statistics(v_company_id);
  end if;
end;
$$;

create or replace function public.admin_set_internship_active(p_position_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.internship_positions
  set is_active = coalesce(p_is_active, false)
  where id = p_position_id;
  if not found then
    raise exception 'internship not found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.admin_set_application_status(p_application_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'accepted', 'rejected', 'completed') then
    raise exception 'invalid status' using errcode = 'P0001';
  end if;
  update public.applications
  set status = p_status
  where id = p_application_id;
  if not found then
    raise exception 'application not found' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.admin_get_platform_analytics()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'students', (select count(*)::int from public.students),
    'supervisors', (select count(*)::int from public.supervisors),
    'companies', (select count(*)::int from public.companies),
    'active_positions', (select count(*)::int from public.internship_positions where is_active = true),
    'applications', (select count(*)::int from public.applications),
    'suspended_users', (select count(*)::int from public.profiles where is_suspended = true),
    'hidden_feedbacks', (
      select (
        (select count(*)::int from public.student_training_evaluations where is_hidden = true)
        + (select count(*)::int from public.ratings where is_hidden = true)
      )
    ),
    'top_companies_by_applications', coalesce((
      select jsonb_agg(row order by (row->>'application_count')::int desc)
      from (
        select jsonb_build_object(
          'company_id', c.id,
          'company_name', c.company_name,
          'application_count', count(a.id)::int
        ) as row
        from public.companies c
        left join public.internship_positions ip on ip.company_id = c.id
        left join public.applications a on a.position_id = ip.id
        group by c.id, c.company_name
        order by count(a.id) desc
        limit 8
      ) t
    ), '[]'::jsonb),
    'top_internships_by_applications', coalesce((
      select jsonb_agg(row order by (row->>'application_count')::int desc)
      from (
        select jsonb_build_object(
          'position_id', ip.id,
          'title', ip.title,
          'company_name', c.company_name,
          'application_count', count(a.id)::int,
          'is_active', ip.is_active
        ) as row
        from public.internship_positions ip
        join public.companies c on c.id = ip.company_id
        left join public.applications a on a.position_id = ip.id
        group by ip.id, ip.title, c.company_name, ip.is_active
        order by count(a.id) desc
        limit 8
      ) t
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- 3) Fix approve_role_upgrade_request — provision company / supervisor rows
-- ---------------------------------------------------------------------------
create or replace function public.approve_role_upgrade_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_payload jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into r from public.role_upgrade_requests where id = p_request_id for update;
  if not found then
    raise exception 'request not found' using errcode = 'P0001';
  end if;
  if r.status is distinct from 'pending' then
    raise exception 'request is not pending' using errcode = 'P0001';
  end if;

  v_payload := coalesce(r.payload, '{}'::jsonb);

  update public.profiles
  set role = r.requested_role, updated_at = now()
  where id = r.user_id;

  if r.requested_role = 'company' then
    insert into public.companies (
      user_id,
      company_name,
      description,
      location,
      website,
      contact_email,
      logo_url
    )
    values (
      r.user_id,
      coalesce(nullif(trim(v_payload->>'company_name'), ''), 'Company'),
      nullif(trim(v_payload->>'description'), ''),
      nullif(trim(v_payload->>'location'), ''),
      nullif(trim(v_payload->>'website'), ''),
      nullif(trim(v_payload->>'contact_email'), ''),
      nullif(trim(v_payload->>'logo_url'), '')
    )
    on conflict (user_id) do update set
      company_name = excluded.company_name,
      description = coalesce(excluded.description, public.companies.description),
      location = coalesce(excluded.location, public.companies.location),
      website = coalesce(excluded.website, public.companies.website),
      contact_email = coalesce(excluded.contact_email, public.companies.contact_email),
      logo_url = coalesce(excluded.logo_url, public.companies.logo_url);
  elsif r.requested_role = 'supervisor' then
    insert into public.supervisors (user_id, department, title, university, office_location)
    values (
      r.user_id,
      nullif(trim(v_payload->>'department'), ''),
      nullif(trim(v_payload->>'title'), ''),
      nullif(trim(v_payload->>'university'), ''),
      nullif(trim(v_payload->>'office_location'), '')
    )
    on conflict (user_id) do update set
      department = coalesce(excluded.department, public.supervisors.department),
      title = coalesce(excluded.title, public.supervisors.title),
      university = coalesce(excluded.university, public.supervisors.university),
      office_location = coalesce(excluded.office_location, public.supervisors.office_location);
  end if;

  update public.role_upgrade_requests
  set status = 'approved', updated_at = now()
  where id = p_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Hide moderated feedback from public company views
-- ---------------------------------------------------------------------------
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
      and e.is_hidden = false
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
      and r.is_hidden = false
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

-- ---------------------------------------------------------------------------
-- 5) Exclude hidden feedback from public aggregates
-- ---------------------------------------------------------------------------
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
  where ip.company_id = p_company_id
    and e.is_hidden = false;

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
      and e.is_hidden = false
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

-- Grants
revoke all on function public.admin_set_user_suspended(uuid, boolean) from public;
revoke all on function public.admin_set_user_role(uuid, text) from public;
revoke all on function public.admin_set_training_feedback_hidden(uuid, boolean) from public;
revoke all on function public.admin_set_rating_hidden(uuid, boolean) from public;
revoke all on function public.admin_set_internship_active(uuid, boolean) from public;
revoke all on function public.admin_set_application_status(uuid, text) from public;
revoke all on function public.admin_get_platform_analytics() from public;

grant execute on function public.admin_set_user_suspended(uuid, boolean) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_set_training_feedback_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_set_rating_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_set_internship_active(uuid, boolean) to authenticated;
grant execute on function public.admin_set_application_status(uuid, text) to authenticated;
grant execute on function public.admin_get_platform_analytics() to authenticated;
