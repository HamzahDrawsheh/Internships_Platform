-- Reliable in-app + email notifications: extend platform helper, DB triggers for report
-- status changes, and route existing security-definer flows through the helper.

-- Live bell updates (Supabase Realtime)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Extended create_platform_notification (preferences + email queue + idempotency)
-- ---------------------------------------------------------------------------
create or replace function public.create_platform_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_related_application_id uuid default null,
  p_related_rating_id uuid default null,
  p_related_conversation_id uuid default null,
  p_link_path text default '/notifications',
  p_related_internship_id uuid default null,
  p_related_monthly_report_id uuid default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_push boolean := true;
  v_email boolean := true;
  v_email_addr text;
  v_notification_id uuid;
begin
  select
    coalesce(p.push_notifications, true),
    coalesce(p.email_notifications, true),
    p.email
  into v_push, v_email, v_email_addr
  from public.profiles p
  where p.id = p_user_id;

  if not found then
    return null;
  end if;

  if v_push then
    if p_idempotency_key is not null then
      insert into public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        related_application_id,
        related_rating_id,
        related_conversation_id,
        related_internship_id,
        related_monthly_report_id,
        idempotency_key
      )
      values (
        p_user_id,
        p_title,
        p_message,
        p_type,
        false,
        p_related_application_id,
        p_related_rating_id,
        p_related_conversation_id,
        p_related_internship_id,
        p_related_monthly_report_id,
        p_idempotency_key
      )
      on conflict (idempotency_key) do nothing
      returning id into v_notification_id;

      if v_notification_id is null then
        select n.id into v_notification_id
        from public.notifications n
        where n.idempotency_key = p_idempotency_key
        limit 1;
      end if;
    else
      insert into public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        related_application_id,
        related_rating_id,
        related_conversation_id,
        related_internship_id,
        related_monthly_report_id
      )
      values (
        p_user_id,
        p_title,
        p_message,
        p_type,
        false,
        p_related_application_id,
        p_related_rating_id,
        p_related_conversation_id,
        p_related_internship_id,
        p_related_monthly_report_id
      )
      returning id into v_notification_id;
    end if;
  end if;

  if v_email and v_email_addr is not null and trim(v_email_addr) <> '' then
    insert into public.transactional_email_queue (
      user_id,
      recipient_email,
      title,
      message,
      type,
      link_path,
      notification_id,
      idempotency_key
    )
    values (
      p_user_id,
      trim(v_email_addr),
      p_title,
      p_message,
      p_type,
      coalesce(nullif(trim(p_link_path), ''), '/notifications'),
      v_notification_id,
      case when p_idempotency_key is not null then p_idempotency_key || ':email' else null end
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return v_notification_id;
end;
$$;

revoke all on function public.create_platform_notification(
  uuid, text, text, text, uuid, uuid, uuid, text, uuid, uuid, text
) from public;
grant execute on function public.create_platform_notification(
  uuid, text, text, text, uuid, uuid, uuid, text, uuid, uuid, text
) to service_role;

-- ---------------------------------------------------------------------------
-- Monthly report status → notifications (replaces failing client-side inserts)
-- ---------------------------------------------------------------------------
create or replace function public.imr_notify_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_user uuid;
  v_student_user uuid;
  v_student_dept text;
  v_month int;
  v_sup record;
  v_link text;
  v_key text;
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;

  v_month := new.month_number;
  v_student_user := public.internship_student_user_id(new.internship_id);

  select c.user_id into v_company_user
  from public.internships i
  join public.companies c on c.id = i.company_id
  where i.id = new.internship_id;

  select trim(coalesce(s.department, '')) into v_student_dept
  from public.internships i
  join public.students s on s.id = i.student_id
  where i.id = new.internship_id;

  case new.status
    when 'pending_employer' then
      if v_company_user is not null then
        v_link := format('/company/internship-reports/%s/month/%s', new.internship_id, v_month);
        v_key := format('imr:%s:pending_employer', new.id);
        perform public.create_platform_notification(
          v_company_user,
          'Monthly report awaiting evaluation',
          format('Month %s internship report submitted. Please complete employer evaluation.', v_month),
          'monthly_report_pending_employer',
          null, null, null,
          v_link,
          new.internship_id,
          new.id,
          v_key
        );
      end if;

    when 'pending_supervisor' then
      if v_student_user is not null then
        v_link := format('/dashboard/student/internship-reports/%s/month/%s', new.internship_id, v_month);
        perform public.create_platform_notification(
          v_student_user,
          'Employer evaluation submitted',
          format('Month %s report is now awaiting university supervisor approval.', v_month),
          'monthly_report_pending_supervisor',
          null, null, null,
          v_link,
          new.internship_id,
          new.id,
          format('imr:%s:pending_supervisor:student', new.id)
        );
      end if;

      if v_student_dept <> '' then
        for v_sup in
          select sup.user_id
          from public.supervisors sup
          where trim(coalesce(sup.department, '')) = v_student_dept
        loop
          perform public.create_platform_notification(
            v_sup.user_id,
            'Monthly report pending approval',
            format('Month %s report ready for supervisor review.', v_month),
            'monthly_report_pending_supervisor',
            null, null, null,
            format('/supervisor/internship-reports/%s/month/%s', new.internship_id, v_month),
            new.internship_id,
            new.id,
            format('imr:%s:pending_supervisor:%s', new.id, v_sup.user_id)
          );
        end loop;
      end if;

    when 'approved' then
      if v_student_user is not null then
        perform public.create_platform_notification(
          v_student_user,
          'Monthly report approved',
          format('Month %s internship report was approved by your supervisor.', v_month),
          'monthly_report_approved',
          null, null, null,
          format('/dashboard/student/internship-reports/%s/month/%s', new.internship_id, v_month),
          new.internship_id,
          new.id,
          format('imr:%s:approved', new.id)
        );
      end if;

    when 'rejected' then
      if v_student_user is not null then
        perform public.create_platform_notification(
          v_student_user,
          'Monthly report needs revision',
          coalesce(nullif(trim(new.rejection_reason), ''), 'Your supervisor requested changes to this monthly report.'),
          'monthly_report_rejected',
          null, null, null,
          format('/dashboard/student/internship-reports/%s/month/%s', new.internship_id, v_month),
          new.internship_id,
          new.id,
          format('imr:%s:rejected', new.id)
        );
      end if;

    when 'unlocked' then
      if v_student_user is not null then
        perform public.create_platform_notification(
          v_student_user,
          'Monthly report unlocked',
          format('Month %s report is now available. Please submit before the due date.', v_month),
          'monthly_report_unlocked',
          null, null, null,
          format('/dashboard/student/internship-reports/%s/month/%s', new.internship_id, v_month),
          new.internship_id,
          new.id,
          format('imr:%s:unlocked', new.id)
        );
      end if;

    when 'overdue' then
      if v_student_user is not null then
        perform public.create_platform_notification(
          v_student_user,
          'Monthly report overdue',
          format('Month %s report is overdue. Submit as soon as possible.', v_month),
          'monthly_report_overdue',
          null, null, null,
          format('/dashboard/student/internship-reports/%s/month/%s', new.internship_id, v_month),
          new.internship_id,
          new.id,
          format('imr:%s:overdue', new.id)
        );
      end if;

    else
      null;
  end case;

  return new;
end;
$$;

drop trigger if exists trg_imr_notify_on_status_change on public.internship_monthly_reports;
create trigger trg_imr_notify_on_status_change
after update of status on public.internship_monthly_reports
for each row
execute function public.imr_notify_on_status_change();

-- ---------------------------------------------------------------------------
-- Final report submitted
-- ---------------------------------------------------------------------------
create or replace function public.ifr_notify_on_submit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_user uuid;
begin
  if new.status is distinct from 'submitted' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status is not distinct from 'submitted' then
    return new;
  end if;

  v_student_user := public.internship_student_user_id(new.internship_id);
  if v_student_user is not null then
    perform public.create_platform_notification(
      v_student_user,
      'Final report submitted',
      'Your final internship report has been uploaded.',
      'final_report_submitted',
      null, null, null,
      format('/dashboard/student/internship-reports/%s', new.internship_id),
      new.internship_id,
      null,
      format('ifr:%s:submitted', new.internship_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ifr_notify_on_submit on public.internship_final_reports;
create trigger trg_ifr_notify_on_submit
after insert or update of status on public.internship_final_reports
for each row
execute function public.ifr_notify_on_submit();

-- ---------------------------------------------------------------------------
-- Internship lifecycle notifications via helper (email + in-app prefs)
-- ---------------------------------------------------------------------------
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
  v_supervisor_name text;
  v_sup record;
begin
  select a.id, a.student_id, a.status, a.accepted_at, a.training_end_date,
         ip.company_id
  into v_app
  from public.applications a
  join public.internship_positions ip on ip.id = a.position_id
  where a.id = p_application;

  if v_app.id is null or v_app.status <> 'accepted' then
    raise exception 'Application must be accepted';
  end if;

  if v_app.accepted_at is null or v_app.training_end_date is null then
    raise exception 'Application missing training schedule';
  end if;

  v_start := (v_app.accepted_at at time zone 'utc')::date;

  select c.company_name into v_supervisor_name
  from public.companies c where c.id = v_app.company_id;

  insert into public.internships (
    application_id, student_id, company_id,
    start_date, end_date, employer_supervisor_name, status
  ) values (
    v_app.id, v_app.student_id, v_app.company_id,
    v_start, v_app.training_end_date, v_supervisor_name,
    'pending_supervisor_approval'
  )
  on conflict (application_id) do update
  set start_date = excluded.start_date,
      end_date = excluded.end_date,
      updated_at = now()
  returning id into v_internship;

  for v_sup in
    select sup.user_id
    from public.students st
    join public.supervisors sup
      on trim(coalesce(sup.department, '')) = trim(coalesce(st.department, ''))
    where st.id = v_app.student_id
  loop
    perform public.create_platform_notification(
      v_sup.user_id,
      'Internship pending your approval',
      'A student in your department was accepted for an internship. Please review and approve tracking.',
      'internship_pending_supervisor',
      p_application,
      null,
      null,
      '/supervisor/internship-reports',
      v_internship,
      null,
      format('internship_pending:%s:%s', v_internship, v_sup.user_id)
    );
  end loop;

  return v_internship;
end;
$$;

create or replace function public.approve_internship_by_supervisor(p_internship uuid, p_supervisor_name text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_user uuid;
begin
  if not public.supervisor_can_access_internship(p_internship) then
    raise exception 'Not authorized';
  end if;

  update public.internships
  set status = 'active',
      supervisor_approved_at = now(),
      supervisor_approved_by = auth.uid(),
      university_supervisor_name = coalesce(nullif(trim(p_supervisor_name), ''), university_supervisor_name),
      updated_at = now()
  where id = p_internship
    and status = 'pending_supervisor_approval';

  if not found then
    raise exception 'Internship not found or already approved';
  end if;

  perform public.generate_internship_monthly_reports(p_internship);
  perform public.generate_internship_attendance(p_internship);
  perform public.sync_internship_report_statuses(p_internship);

  perform public.generate_weekly_report_slots(r.id)
  from public.internship_monthly_reports r
  where r.internship_id = p_internship;

  select public.internship_student_user_id(p_internship) into v_student_user;
  if v_student_user is not null then
    perform public.create_platform_notification(
      v_student_user,
      'Internship tracking activated',
      'Your university supervisor approved your internship. Monthly reports and attendance tracking are now active.',
      'internship_supervisor_approved',
      null, null, null,
      '/dashboard/student/internship-reports',
      p_internship,
      null,
      format('internship_supervisor_approved:%s', p_internship)
    );
  end if;

  return true;
end;
$$;

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
    perform public.create_platform_notification(
      v_student_user,
      'Internship tracking activated',
      'Your internship monthly reports and attendance tracking are now active.',
      'internship_supervisor_approved',
      null, null, null,
      '/dashboard/student/internship-reports',
      p_internship,
      null,
      format('internship_supervisor_approved:%s', p_internship)
    );
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role upgrade approve / reject → notify applicant
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
  v_role_label text;
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
      user_id, company_name, description, location, website, contact_email, logo_url
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

  v_role_label := case r.requested_role
    when 'company' then 'company'
    when 'supervisor' then 'university supervisor'
    else r.requested_role
  end;

  perform public.create_platform_notification(
    r.user_id,
    'Account upgrade approved',
    format('Your request to join as a %s was approved. You can now use your new dashboard.', v_role_label),
    'info',
    null, null, null,
    case r.requested_role
      when 'company' then '/dashboard/company'
      when 'supervisor' then '/dashboard/supervisor'
      else '/notifications'
    end,
    null,
    null,
    format('role_upgrade_approved:%s', p_request_id)
  );
end;
$$;

create or replace function public.reject_role_upgrade_request(
  p_request_id uuid,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into r
  from public.role_upgrade_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0001';
  end if;

  if r.status is distinct from 'pending' then
    raise exception 'request is not pending' using errcode = 'P0001';
  end if;

  update public.role_upgrade_requests
  set
    status = 'rejected',
    admin_notes = p_admin_notes,
    updated_at = now()
  where id = p_request_id;

  perform public.create_platform_notification(
    r.user_id,
    'Account upgrade not approved',
    coalesce(
      nullif(trim(p_admin_notes), ''),
      'Your request to upgrade your account was not approved. Contact support if you have questions.'
    ),
    'info',
    null, null, null,
    '/pending-approval',
    null,
    null,
    format('role_upgrade_rejected:%s', p_request_id)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Commitment flow notifications (prefs + email)
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_application_commitments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  rec record;
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

    perform public.create_platform_notification(
      rec.student_user_id,
      'Offer expired',
      format(
        'Your acceptance for "%s" expired because you did not confirm your commitment within 3 days.',
        rec.internship_title
      ),
      'commitment_expired',
      rec.application_id,
      null,
      null,
      '/applications',
      null,
      null,
      format('commitment_expired:%s', rec.application_id)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

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
