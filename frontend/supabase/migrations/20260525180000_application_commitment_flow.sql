-- Student must confirm company acceptance within 3 days; other applications are withdrawn on confirm.

alter table public.applications
  add column if not exists commitment_deadline timestamptz,
  add column if not exists committed_at timestamptz;

alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (
    status in (
      'pending',
      'accepted_pending_commit',
      'accepted',
      'rejected',
      'completed',
      'commitment_expired',
      'withdrawn'
    )
  );

-- Extend notification types for commitment workflow
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'accepted', 'rejected', 'application_accepted', 'application_rejected',
      'info', 'training_completed', 'application_expired', 'new_application',
      'new_feedback', 'new_training_evaluation', 'new_direct_message',
      'monthly_report_unlocked', 'monthly_report_overdue', 'monthly_report_pending_employer',
      'monthly_report_pending_supervisor', 'monthly_report_approved', 'monthly_report_rejected',
      'internship_pending_supervisor', 'internship_supervisor_approved',
      'final_report_required', 'final_report_submitted',
      'commitment_required', 'commitment_confirmed', 'commitment_expired', 'application_withdrawn'
    )
  );

-- Internship tracking starts only after the student confirms commitment.
create or replace function public.trg_application_accepted_init_internship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.initialize_internship_from_application(new.id);
  end if;
  if new.status <> 'accepted' and old.status = 'accepted' then
    update public.internships
    set status = 'cancelled', updated_at = now()
    where application_id = new.id and status <> 'completed';
  end if;
  if new.status = 'completed' and old.status = 'accepted' then
    update public.internships
    set status = 'completed', updated_at = now()
    where application_id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.student_has_committed_internship(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.student_id = p_student_id
      and a.status = 'accepted'
  );
$$;

grant execute on function public.student_has_committed_internship(uuid) to authenticated;

create or replace function public.expire_stale_application_commitments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  rec record;
  v_title text;
begin
  for rec in
    select
      a.id as application_id,
      s.user_id as student_user_id,
      coalesce(ip.title, 'Internship') as internship_title
    from public.applications a
    join public.students s on s.id = a.student_id
    join public.internship_positions ip on ip.id = a.position_id
    where a.status = 'accepted_pending_commit'
      and a.commitment_deadline is not null
      and a.commitment_deadline < now()
    for update of a skip locked
  loop
    update public.applications
    set status = 'commitment_expired',
        commitment_deadline = null
    where id = rec.application_id;

    insert into public.notifications (
      user_id, title, message, type, is_read, related_application_id
    )
    values (
      rec.student_user_id,
      'Offer expired',
      format(
        'Your acceptance for "%s" expired because you did not confirm your commitment within 3 days.',
        rec.internship_title
      ),
      'commitment_expired',
      false,
      rec.application_id
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.expire_stale_application_commitments() to authenticated;

create or replace function public.student_confirm_application_commitment(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_student_id uuid;
  v_app record;
  v_pos record;
  v_company record;
  v_withdrawn int := 0;
  v_w record;
  v_weeks int;
  v_training_end date;
  v_internship_title text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select s.id into v_student_id
  from public.students s
  where s.user_id = v_user_id;

  if v_student_id is null then
    return jsonb_build_object('ok', false, 'error', 'student_not_found');
  end if;

  select a.* into v_app
  from public.applications a
  where a.id = p_application_id
    and a.student_id = v_student_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'application_not_found');
  end if;

  if v_app.status <> 'accepted_pending_commit' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if v_app.commitment_deadline is not null and v_app.commitment_deadline < now() then
    update public.applications
    set status = 'commitment_expired', commitment_deadline = null
    where id = p_application_id;
    return jsonb_build_object('ok', false, 'error', 'deadline_passed');
  end if;

  if public.student_has_committed_internship(v_student_id) then
    return jsonb_build_object('ok', false, 'error', 'already_committed');
  end if;

  select ip.title, ip.duration_weeks, ip.duration, ip.company_id
  into v_pos
  from public.internship_positions ip
  where ip.id = v_app.position_id;

  v_internship_title := coalesce(v_pos.title, 'Internship');

  v_weeks := null;
  if v_pos.duration_weeks is not null and v_pos.duration_weeks > 0 then
    v_weeks := floor(v_pos.duration_weeks)::int;
  elsif v_pos.duration ~ '^\d+' then
    v_weeks := (substring(v_pos.duration from '^\d+'))::int;
  end if;

  if v_weeks is not null and v_weeks > 0 then
    v_training_end := (current_date + (v_weeks * 7))::date;
  else
    v_training_end := null;
  end if;

  update public.applications
  set status = 'accepted',
      committed_at = now(),
      training_end_date = v_training_end
  where id = p_application_id;

  for v_w in
    select
      a.id,
      a.position_id,
      coalesce(ip.title, 'Internship') as internship_title,
      c.user_id as company_user_id
    from public.applications a
    join public.internship_positions ip on ip.id = a.position_id
    join public.companies c on c.id = ip.company_id
    where a.student_id = v_student_id
      and a.id <> p_application_id
      and a.status in ('pending', 'accepted_pending_commit')
    for update of a
  loop
    update public.applications
    set status = 'withdrawn',
        commitment_deadline = null,
        accepted_at = null,
        training_end_date = null
    where id = v_w.id;

    insert into public.notifications (
      user_id, title, message, type, is_read, related_application_id
    )
    values (
      v_user_id,
      'Application withdrawn',
      format(
        'Your application for "%s" was withdrawn because you committed to another internship.',
        v_w.internship_title
      ),
      'application_withdrawn',
      false,
      v_w.id
    );

    if v_w.company_user_id is not null then
      insert into public.notifications (
        user_id, title, message, type, is_read, related_application_id
      )
      values (
        v_w.company_user_id,
        'Application withdrawn',
        format(
          'A student withdrew their application for "%s" after committing to another internship.',
          v_w.internship_title
        ),
        'application_withdrawn',
        false,
        v_w.id
      );
    end if;

    v_withdrawn := v_withdrawn + 1;
  end loop;

  insert into public.notifications (
    user_id, title, message, type, is_read, related_application_id
  )
  values (
    v_user_id,
    'Commitment confirmed',
    format(
      'You confirmed your commitment to "%s". Your other applications have been withdrawn.',
      v_internship_title
    ),
    'commitment_confirmed',
    false,
    p_application_id
  );

  select c.user_id, c.company_name
  into v_company
  from public.companies c
  where c.id = v_pos.company_id;

  if v_company.user_id is not null then
    insert into public.notifications (
      user_id, title, message, type, is_read, related_application_id
    )
    values (
      v_company.user_id,
      'Student confirmed commitment',
      format(
        'The student confirmed their commitment to "%s". Internship tracking will begin.',
        v_internship_title
      ),
      'commitment_confirmed',
      false,
      p_application_id
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'withdrawn_count', v_withdrawn,
    'internship_title', v_internship_title
  );
end;
$$;

grant execute on function public.student_confirm_application_commitment(uuid) to authenticated;

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
  if p_status not in (
    'pending',
    'accepted_pending_commit',
    'accepted',
    'rejected',
    'completed',
    'commitment_expired',
    'withdrawn'
  ) then
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
