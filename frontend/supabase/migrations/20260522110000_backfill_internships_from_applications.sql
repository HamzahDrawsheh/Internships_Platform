-- =========================================================
-- Backfill internship tracking for applications accepted
-- before the monthly-reports feature existed.
-- =========================================================

-- Resolve training start/end from application + position (handles legacy null dates).
create or replace function public.resolve_application_training_dates(p_application uuid)
returns table(resolved_start date, resolved_end date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_app record;
  v_weeks int;
  v_start date;
begin
  select a.accepted_at, a.applied_at, a.training_end_date,
         ip.duration_weeks, ip.duration
  into v_app
  from public.applications a
  join public.internship_positions ip on ip.id = a.position_id
  where a.id = p_application;

  if v_app is null then
    return;
  end if;

  v_start := coalesce(
    (v_app.accepted_at at time zone 'utc')::date,
    (v_app.applied_at at time zone 'utc')::date,
    current_date
  );

  if v_app.training_end_date is not null then
    resolved_start := v_start;
    resolved_end := v_app.training_end_date;
    return next;
    return;
  end if;

  v_weeks := v_app.duration_weeks;
  if v_weeks is null or v_weeks <= 0 then
    v_weeks := coalesce(
      (regexp_match(trim(coalesce(v_app.duration, '')), '^(\d+)'))[1]::integer,
      12
    );
  end if;
  if v_weeks is null or v_weeks <= 0 then
    v_weeks := 12;
  end if;

  resolved_start := v_start;
  resolved_end := (v_start + (v_weeks * 7))::date;
  return next;
end;
$$;

-- Shared activation: generate monthly reports, attendance, weekly slots.
create or replace function public.activate_internship_tracking(p_internship uuid, p_supervisor_name text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_user uuid;
begin
  update public.internships
  set status = 'active',
      supervisor_approved_at = coalesce(supervisor_approved_at, now()),
      university_supervisor_name = coalesce(nullif(trim(p_supervisor_name), ''), university_supervisor_name),
      updated_at = now()
  where id = p_internship
    and status in ('pending_supervisor_approval', 'active');

  if not found then
    return false;
  end if;

  perform public.generate_internship_monthly_reports(p_internship);
  perform public.generate_internship_attendance(p_internship);
  perform public.sync_internship_report_statuses(p_internship);

  perform public.generate_weekly_report_slots(r.id)
  from public.internship_monthly_reports r
  where r.internship_id = p_internship;

  select public.internship_student_user_id(p_internship) into v_student_user;
  if v_student_user is not null then
    insert into public.notifications (user_id, title, message, type, is_read, related_internship_id)
    select v_student_user,
      'Internship tracking activated',
      'Your internship monthly reports and attendance tracking are now active.',
      'internship_supervisor_approved',
      false,
      p_internship
    where not exists (
      select 1 from public.notifications n
      where n.user_id = v_student_user
        and n.related_internship_id = p_internship
        and n.type = 'internship_supervisor_approved'
    );
  end if;

  return true;
end;
$$;

-- Improved initializer: accepts accepted/completed, backfills missing schedule on application row.
create or replace function public.initialize_internship_from_application(p_application uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app record;
  v_internship uuid;
  v_start date;
  v_end date;
  v_supervisor_name text;
  v_internship_status text;
begin
  select a.id, a.student_id, a.status, a.accepted_at, a.training_end_date,
         ip.company_id
  into v_app
  from public.applications a
  join public.internship_positions ip on ip.id = a.position_id
  where a.id = p_application;

  if v_app.id is null or v_app.status not in ('accepted', 'completed') then
    raise exception 'Application must be accepted or completed';
  end if;

  select rd.resolved_start, rd.resolved_end
  into v_start, v_end
  from public.resolve_application_training_dates(p_application) rd;

  if v_start is null or v_end is null then
    raise exception 'Could not resolve training schedule';
  end if;

  -- Persist resolved schedule on legacy application rows.
  update public.applications
  set accepted_at = coalesce(accepted_at, v_start::timestamptz),
      training_end_date = coalesce(training_end_date, v_end)
  where id = p_application
    and (accepted_at is null or training_end_date is null);

  select c.company_name into v_supervisor_name
  from public.companies c where c.id = v_app.company_id;

  v_internship_status := case
    when v_app.status = 'completed' then 'completed'
    else 'pending_supervisor_approval'
  end;

  insert into public.internships (
    application_id, student_id, company_id,
    start_date, end_date, employer_supervisor_name, status
  ) values (
    v_app.id, v_app.student_id, v_app.company_id,
    v_start, v_end, v_supervisor_name,
    v_internship_status
  )
  on conflict (application_id) do update
  set start_date = excluded.start_date,
      end_date = excluded.end_date,
      status = case
        when public.internships.status = 'cancelled' then excluded.status
        when public.internships.status = 'completed' then 'completed'
        when excluded.status = 'completed' then 'completed'
        else public.internships.status
      end,
      updated_at = now()
  returning id into v_internship;

  if v_app.status = 'accepted' then
    insert into public.notifications (user_id, title, message, type, is_read, related_application_id, related_internship_id)
    select sup.user_id,
      'Internship pending your approval',
      'A student in your department was accepted for an internship. Please review and approve tracking.',
      'internship_pending_supervisor',
      false,
      p_application,
      v_internship
    from public.students st
    join public.supervisors sup on trim(coalesce(sup.department, '')) = trim(coalesce(st.department, ''))
    where st.id = v_app.student_id
      and not exists (
        select 1 from public.notifications n
        where n.user_id = sup.user_id
          and n.related_internship_id = v_internship
          and n.type = 'internship_pending_supervisor'
      );
  end if;

  return v_internship;
end;
$$;

-- Backfill all legacy accepted/completed applications missing internship rows.
create or replace function public.backfill_internships_from_applications(p_auto_activate_accepted boolean default true)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_internship uuid;
  v_count int := 0;
begin
  for rec in
    select a.id, a.status
    from public.applications a
    where a.status in ('accepted', 'completed')
      and not exists (
        select 1 from public.internships i where i.application_id = a.id
      )
    order by a.applied_at asc
  loop
    v_internship := public.initialize_internship_from_application(rec.id);

    if rec.status = 'accepted' and p_auto_activate_accepted then
      perform public.activate_internship_tracking(v_internship, null);
    elsif rec.status = 'completed' then
      perform public.activate_internship_tracking(v_internship, null);
      update public.internships
      set status = 'completed', updated_at = now()
      where id = v_internship;
    end if;

    v_count := v_count + 1;
  end loop;

  -- Existing internship rows linked to accepted apps still pending (edge case).
  if p_auto_activate_accepted then
    for rec in
      select i.id
      from public.internships i
      join public.applications a on a.id = i.application_id
      where a.status = 'accepted'
        and i.status = 'pending_supervisor_approval'
    loop
      perform public.activate_internship_tracking(rec.id, null);
      v_count := v_count + 1;
    end loop;
  end if;

  return v_count;
end;
$$;

-- Per-student self-heal (callable from frontend on page load).
create or replace function public.ensure_student_internship_tracking()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_internship uuid;
  v_count int := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;

  for rec in
    select a.id, a.status
    from public.applications a
    join public.students s on s.id = a.student_id
    where s.user_id = auth.uid()
      and a.status in ('accepted', 'completed')
  loop
    select i.id into v_internship
    from public.internships i
    where i.application_id = rec.id;

    if v_internship is null then
      v_internship := public.initialize_internship_from_application(rec.id);
      v_count := v_count + 1;
    end if;

    if rec.status = 'accepted' then
      if exists (
        select 1 from public.internships i
        where i.id = v_internship and i.status = 'pending_supervisor_approval'
      ) then
        perform public.activate_internship_tracking(v_internship, null);
        v_count := v_count + 1;
      elsif not exists (
        select 1 from public.internship_monthly_reports r where r.internship_id = v_internship
      ) then
        perform public.activate_internship_tracking(v_internship, null);
        v_count := v_count + 1;
      end if;
    elsif rec.status = 'completed' then
      if not exists (
        select 1 from public.internship_monthly_reports r where r.internship_id = v_internship
      ) then
        perform public.activate_internship_tracking(v_internship, null);
      end if;
      update public.internships
      set status = 'completed', updated_at = now()
      where id = v_internship and status <> 'completed';
    end if;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.ensure_student_internship_tracking() to authenticated;
grant execute on function public.backfill_internships_from_applications(boolean) to authenticated;

-- Refactor supervisor approve to reuse activation helper.
create or replace function public.approve_internship_by_supervisor(p_internship uuid, p_supervisor_name text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.supervisor_can_access_internship(p_internship) then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.internships
    where id = p_internship and status = 'pending_supervisor_approval'
  ) then
    raise exception 'Internship not found or already approved';
  end if;

  update public.internships
  set supervisor_approved_by = auth.uid(),
      university_supervisor_name = coalesce(nullif(trim(p_supervisor_name), ''), university_supervisor_name),
      updated_at = now()
  where id = p_internship;

  return public.activate_internship_tracking(p_internship, p_supervisor_name);
end;
$$;

-- Run one-time backfill for all existing data.
select public.backfill_internships_from_applications(true);
