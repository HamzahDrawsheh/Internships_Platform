-- =========================================================
-- Repair internship report sync: ensure monthly + weekly
-- rows exist and unlock current month for testing/workflow.
-- =========================================================

-- Generate all child records (monthly, attendance, weekly) regardless of internship status.
create or replace function public.ensure_internship_report_children(p_internship uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.internships
    where id = p_internship and status <> 'cancelled'
  ) then
    return;
  end if;

  perform public.generate_internship_monthly_reports(p_internship);
  perform public.generate_internship_attendance(p_internship);

  perform public.generate_weekly_report_slots(r.id)
  from public.internship_monthly_reports r
  where r.internship_id = p_internship;

  perform public.sync_internship_report_statuses(p_internship);
end;
$$;

grant execute on function public.ensure_internship_report_children(uuid) to authenticated;

-- Unlock when the reporting period has started (not only after full month ends).
create or replace function public.sync_internship_report_statuses(p_internship uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_updated int := 0;
begin
  for rec in
    select r.id, r.internship_id, r.month_number, r.status, r.period_start, r.unlock_date, r.due_date
    from public.internship_monthly_reports r
    join public.internships i on i.id = r.internship_id
    where i.status in ('active', 'completed', 'pending_supervisor_approval')
      and (p_internship is null or r.internship_id = p_internship)
  loop
    if rec.status = 'locked'
       and rec.period_start <= current_date
       and public.previous_monthly_report_approved(rec.internship_id, rec.month_number) then
      update public.internship_monthly_reports
      set status = 'unlocked', updated_at = now()
      where id = rec.id;
      v_updated := v_updated + 1;
    elsif rec.status in ('unlocked', 'pending_student', 'rejected')
          and rec.due_date < current_date then
      update public.internship_monthly_reports
      set status = 'overdue', updated_at = now()
      where id = rec.id;
      v_updated := v_updated + 1;
    end if;
  end loop;
  return v_updated;
end;
$$;

-- Initial status: unlocked once the period has started.
create or replace function public.generate_internship_monthly_reports(p_internship uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
  v_month int := 0;
  v_period_start date;
  v_period_end date;
  v_unlock date;
  v_due date;
  v_status text;
  v_count int := 0;
  v_inserted int;
begin
  select start_date, end_date into v_start, v_end
  from public.internships where id = p_internship;

  if v_start is null or v_end is null then
    return 0;
  end if;

  if v_end < v_start then
    return 0;
  end if;

  loop
    v_month := v_month + 1;
    v_period_start := (v_start + ((v_month - 1) || ' months')::interval)::date;
    exit when v_period_start > v_end;

    v_unlock := (v_start + (v_month || ' months')::interval)::date;
    v_period_end := least((v_unlock - interval '1 day')::date, v_end);
    v_due := (greatest(v_unlock, v_period_end) + interval '7 days')::date;

    v_status := case
      when v_period_start <= current_date
        and public.previous_monthly_report_approved(p_internship, v_month)
      then 'unlocked'
      else 'locked'
    end;

    insert into public.internship_monthly_reports (
      internship_id, month_number, period_start, period_end,
      unlock_date, due_date, status
    ) values (
      p_internship, v_month, v_period_start, v_period_end,
      v_unlock, v_due, v_status
    )
    on conflict (internship_id, month_number) do update
    set period_start = excluded.period_start,
        period_end = excluded.period_end,
        unlock_date = excluded.unlock_date,
        due_date = excluded.due_date,
        updated_at = now();

    get diagnostics v_inserted = row_count;
    if v_inserted > 0 then
      v_count := v_count + 1;
    end if;

    exit when v_period_end >= v_end;
  end loop;

  return v_count;
end;
$$;

-- Ensure weekly slots for one monthly report (callable from client).
create or replace function public.ensure_monthly_report_weekly_slots(p_monthly_report uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_internship uuid;
begin
  select r.internship_id into v_internship
  from public.internship_monthly_reports r
  where r.id = p_monthly_report;

  if v_internship is null then
    return 0;
  end if;

  if not (
    public.internship_student_user_id(v_internship) = auth.uid()
    or public.internship_company_user_id(v_internship) = auth.uid()
    or public.supervisor_can_access_internship(v_internship)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) then
    raise exception 'Not authorized';
  end if;

  return public.generate_weekly_report_slots(p_monthly_report);
end;
$$;

grant execute on function public.ensure_monthly_report_weekly_slots(uuid) to authenticated;

-- Repair one internship or all.
create or replace function public.repair_internship_tracking(p_internship uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_count int := 0;
begin
  for rec in
    select i.id
    from public.internships i
    where i.status <> 'cancelled'
      and (p_internship is null or i.id = p_internship)
  loop
    perform public.ensure_internship_report_children(rec.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function public.repair_internship_tracking(uuid) to authenticated;

-- Student self-heal: create internship + generate all report rows.
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

    if rec.status = 'accepted' and exists (
      select 1 from public.internships i
      where i.id = v_internship and i.status = 'pending_supervisor_approval'
    ) then
      perform public.activate_internship_tracking(v_internship, null);
      v_count := v_count + 1;
    end if;

    if rec.status = 'completed' then
      update public.internships
      set status = 'completed', updated_at = now()
      where id = v_internship and status <> 'completed';
    end if;

    perform public.ensure_internship_report_children(v_internship);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- activate_internship_tracking: always ensure children even if already active.
create or replace function public.activate_internship_tracking(p_internship uuid, p_supervisor_name text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_user uuid;
  v_exists boolean;
begin
  select exists (
    select 1 from public.internships
    where id = p_internship and status <> 'cancelled'
  ) into v_exists;

  if not v_exists then
    return false;
  end if;

  update public.internships
  set status = case when status = 'completed' then 'completed' else 'active' end,
      supervisor_approved_at = coalesce(supervisor_approved_at, now()),
      university_supervisor_name = coalesce(nullif(trim(p_supervisor_name), ''), university_supervisor_name),
      updated_at = now()
  where id = p_internship
    and status in ('pending_supervisor_approval', 'active', 'completed');

  perform public.ensure_internship_report_children(p_internship);

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

-- Repair all existing internships now.
select public.repair_internship_tracking(null);
