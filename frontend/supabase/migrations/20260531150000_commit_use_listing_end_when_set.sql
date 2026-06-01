-- Per-student training end at commit: use listing end_date when set (and >= commit day),
-- else duration from commit date.

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

  select ip.title, ip.duration_weeks, ip.duration, ip.company_id, ip.end_date
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

  if v_pos.end_date is not null and v_pos.end_date >= current_date then
    v_training_end := v_pos.end_date;
  elsif v_weeks is not null and v_weeks > 0 then
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

    perform public.create_platform_notification(
      v_user_id,
      'Application withdrawn',
      format(
        'Your application for "%s" was withdrawn because you committed to another internship.',
        v_w.internship_title
      ),
      'application_withdrawn',
      v_w.id,
      null,
      null,
      '/applications',
      null,
      null,
      format('application_withdrawn:student:%s', v_w.id)
    );

    if v_w.company_user_id is not null then
      perform public.create_platform_notification(
        v_w.company_user_id,
        'Application withdrawn',
        format(
          'A student withdrew their application for "%s" after committing to another internship.',
          v_w.internship_title
        ),
        'application_withdrawn',
        v_w.id,
        null,
        null,
        '/company/applications',
        null,
        null,
        format('application_withdrawn:company:%s', v_w.id)
      );
    end if;

    v_withdrawn := v_withdrawn + 1;
  end loop;

  perform public.create_platform_notification(
    v_user_id,
    'Commitment confirmed',
    format(
      'You confirmed your commitment to "%s". Your other applications have been withdrawn.',
      v_internship_title
    ),
    'commitment_confirmed',
    p_application_id,
    null,
    null,
    '/applications',
    null,
    null,
    format('commitment_confirmed:student:%s', p_application_id)
  );

  select c.user_id, c.company_name
  into v_company
  from public.companies c
  where c.id = v_pos.company_id;

  if v_company.user_id is not null then
    perform public.create_platform_notification(
      v_company.user_id,
      'Student confirmed commitment',
      format(
        'The student confirmed their commitment to "%s". Internship tracking will begin.',
        v_internship_title
      ),
      'commitment_confirmed',
      p_application_id,
      null,
      null,
      '/company/applications',
      null,
      null,
      format('commitment_confirmed:company:%s', p_application_id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'withdrawn_count', v_withdrawn,
    'internship_title', v_internship_title
  );
end;
$$;
