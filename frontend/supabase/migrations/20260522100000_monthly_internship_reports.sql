-- =========================================================
-- Monthly Internship Report Submission System (JUST digital workflow)
-- =========================================================

-- --- 1) Core internship tracking (linked to accepted application) ----------------
create table if not exists public.internships (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending_supervisor_approval'
    check (status in ('pending_supervisor_approval', 'active', 'completed', 'cancelled')),
  supervisor_approved_at timestamptz,
  supervisor_approved_by uuid references public.profiles(id) on delete set null,
  university_supervisor_name text,
  employer_supervisor_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internships_end_after_start check (end_date >= start_date)
);

create index if not exists idx_internships_student_id on public.internships(student_id);
create index if not exists idx_internships_company_id on public.internships(company_id);
create index if not exists idx_internships_status on public.internships(status);
create index if not exists idx_internships_application_id on public.internships(application_id);

drop trigger if exists trg_internships_set_updated_at on public.internships;
create trigger trg_internships_set_updated_at
before update on public.internships
for each row execute function public.set_updated_at();

-- --- 2) Monthly reports -----------------------------------------------------------
create table if not exists public.internship_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships(id) on delete cascade,
  month_number integer not null check (month_number > 0),
  period_start date not null,
  period_end date not null,
  unlock_date date not null,
  due_date date not null,
  status text not null default 'locked'
    check (status in (
      'locked', 'unlocked', 'pending_student', 'pending_employer',
      'pending_supervisor', 'approved', 'rejected', 'overdue'
    )),
  assignments text,
  work_summary text,
  student_submission_date timestamptz,
  employer_submission_date timestamptz,
  supervisor_approval_date timestamptz,
  supervisor_comments text,
  rejection_reason text,
  generated_pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internship_monthly_reports_unique_month unique (internship_id, month_number)
);

create index if not exists idx_imr_internship on public.internship_monthly_reports(internship_id);
create index if not exists idx_imr_status on public.internship_monthly_reports(status);
create index if not exists idx_imr_unlock on public.internship_monthly_reports(unlock_date);

drop trigger if exists trg_imr_set_updated_at on public.internship_monthly_reports;
create trigger trg_imr_set_updated_at
before update on public.internship_monthly_reports
for each row execute function public.set_updated_at();

-- --- 3) Weekly work descriptions (Part I) ---------------------------------------
create table if not exists public.internship_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  monthly_report_id uuid not null references public.internship_monthly_reports(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internship_weekly_reports_unique_week unique (monthly_report_id, week_number)
);

create index if not exists idx_iwr_monthly on public.internship_weekly_reports(monthly_report_id);

-- --- 4) Attendance / timesheet --------------------------------------------------
create table if not exists public.internship_attendance (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships(id) on delete cascade,
  date date not null,
  weekday text,
  attendance_status text not null default 'present'
    check (attendance_status in ('present', 'absent', 'excused', 'holiday')),
  start_time time,
  end_time time,
  total_hours numeric(5,2) check (total_hours is null or total_hours >= 0),
  remarks text,
  student_signed_at timestamptz,
  mentor_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internship_attendance_unique_day unique (internship_id, date)
);

create index if not exists idx_ia_internship_date on public.internship_attendance(internship_id, date);

-- --- 5) Employer evaluation (Part II) -------------------------------------------
create table if not exists public.internship_employer_evaluations (
  id uuid primary key default gen_random_uuid(),
  monthly_report_id uuid not null unique references public.internship_monthly_reports(id) on delete cascade,
  relations_with_others text not null,
  ability_to_learn text not null,
  dependability text not null,
  overall_performance text not null,
  work_ethics text not null,
  attitudes text not null,
  quality_of_work text not null,
  attendance_record text not null,
  advancement_traits text,
  additional_remarks text,
  evaluator_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- 6) Final internship report upload ------------------------------------------
create table if not exists public.internship_final_reports (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null unique references public.internships(id) on delete cascade,
  pdf_url text not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected')),
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now()
);

-- --- 7) Digital signatures ------------------------------------------------------
create table if not exists public.user_signatures (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  signature_data_url text not null,
  updated_at timestamptz not null default now()
);

-- --- Notification types extension ------------------------------------------------
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
      'final_report_required', 'final_report_submitted'
    )
  );

alter table public.notifications
  add column if not exists related_internship_id uuid references public.internships(id) on delete set null;

alter table public.notifications
  add column if not exists related_monthly_report_id uuid references public.internship_monthly_reports(id) on delete set null;

create index if not exists idx_notifications_related_internship on public.notifications(related_internship_id);
create index if not exists idx_notifications_related_monthly_report on public.notifications(related_monthly_report_id);

-- --- Helper: internship access --------------------------------------------------
create or replace function public.internship_student_user_id(p_internship uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id from public.internships i
  join public.students s on s.id = i.student_id
  where i.id = p_internship
  limit 1;
$$;

create or replace function public.internship_company_user_id(p_internship uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.user_id from public.internships i
  join public.companies c on c.id = i.company_id
  where i.id = p_internship
  limit 1;
$$;

create or replace function public.supervisor_can_access_internship(p_internship uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.internships i
    join public.students st on st.id = i.student_id
    join public.supervisors sup on sup.user_id = auth.uid()
    where i.id = p_internship
      and trim(coalesce(st.department, '')) = trim(coalesce(sup.department, ''))
  );
$$;

create or replace function public.previous_monthly_report_approved(p_internship uuid, p_month integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_month <= 1 then true
    else exists (
      select 1 from public.internship_monthly_reports r
      where r.internship_id = p_internship
        and r.month_number = p_month - 1
        and r.status = 'approved'
    )
  end;
$$;

-- --- Generate monthly cycles from start/end -------------------------------------
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
  v_count int := 0;
begin
  select start_date, end_date into v_start, v_end
  from public.internships where id = p_internship;

  if v_start is null then return 0; end if;

  loop
    v_month := v_month + 1;
    v_period_start := (v_start + ((v_month - 1) || ' months')::interval)::date;
    exit when v_period_start > v_end;

    v_unlock := (v_start + (v_month || ' months')::interval)::date;
    v_period_end := least((v_unlock - interval '1 day')::date, v_end);
    v_due := v_unlock + interval '7 days';

    insert into public.internship_monthly_reports (
      internship_id, month_number, period_start, period_end,
      unlock_date, due_date, status
    ) values (
      p_internship, v_month, v_period_start, v_period_end,
      v_unlock, v_due::date,
      case when v_unlock <= current_date then 'unlocked' else 'locked' end
    )
    on conflict (internship_id, month_number) do nothing;

    if found then v_count := v_count + 1; end if;

    exit when v_unlock >= v_end;
  end loop;

  return v_count;
end;
$$;

-- --- Generate attendance dates --------------------------------------------------
create or replace function public.generate_internship_attendance(p_internship uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
  v_d date;
  v_count int := 0;
  v_weekday text;
begin
  select start_date, end_date into v_start, v_end
  from public.internships where id = p_internship;

  if v_start is null then return 0; end if;

  v_d := v_start;
  while v_d <= v_end loop
    v_weekday := trim(to_char(v_d, 'Day'));
    insert into public.internship_attendance (
      internship_id, date, weekday, attendance_status
    ) values (
      p_internship, v_d, v_weekday,
      case when extract(dow from v_d) in (0, 6) then 'holiday' else 'present' end
    )
    on conflict (internship_id, date) do nothing;
    if found then v_count := v_count + 1; end if;
    v_d := v_d + 1;
  end loop;

  return v_count;
end;
$$;

-- --- Create weekly report slots for a monthly report ------------------------------
create or replace function public.generate_weekly_report_slots(p_monthly_report uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
  v_week int := 0;
  v_cursor date;
  v_count int := 0;
begin
  select r.period_start, r.period_end into v_start, v_end
  from public.internship_monthly_reports r where r.id = p_monthly_report;

  v_cursor := v_start;
  while v_cursor <= v_end loop
    v_week := v_week + 1;
    insert into public.internship_weekly_reports (monthly_report_id, week_number, description)
    values (p_monthly_report, v_week, '')
    on conflict (monthly_report_id, week_number) do nothing;
    if found then v_count := v_count + 1; end if;
    v_cursor := v_cursor + 7;
  end loop;

  return v_count;
end;
$$;

-- --- Sync unlock / overdue statuses ---------------------------------------------
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
    select r.id, r.internship_id, r.month_number, r.status, r.unlock_date, r.due_date
    from public.internship_monthly_reports r
    join public.internships i on i.id = r.internship_id
    where i.status = 'active'
      and (p_internship is null or r.internship_id = p_internship)
  loop
    if rec.status = 'locked'
       and rec.unlock_date <= current_date
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

grant execute on function public.sync_internship_report_statuses(uuid) to authenticated;

-- --- Initialize internship on application accept --------------------------------
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

  -- Notify supervisors in same department
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
  where st.id = v_app.student_id;

  return v_internship;
end;
$$;

grant execute on function public.initialize_internship_from_application(uuid) to authenticated;

-- --- Supervisor approves internship ---------------------------------------------
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

  -- Weekly slots for all monthly reports
  perform public.generate_weekly_report_slots(r.id)
  from public.internship_monthly_reports r
  where r.internship_id = p_internship;

  select public.internship_student_user_id(p_internship) into v_student_user;
  if v_student_user is not null then
    insert into public.notifications (user_id, title, message, type, is_read, related_internship_id)
    values (
      v_student_user,
      'Internship tracking activated',
      'Your university supervisor approved your internship. Monthly reports and attendance tracking are now active.',
      'internship_supervisor_approved',
      false,
      p_internship
    );
  end if;

  return true;
end;
$$;

grant execute on function public.approve_internship_by_supervisor(uuid, text) to authenticated;

-- --- Trigger: auto-init internship when application accepted --------------------
create or replace function public.trg_application_accepted_init_internship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
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

drop trigger if exists trg_applications_internship_lifecycle on public.applications;
create trigger trg_applications_internship_lifecycle
after update of status on public.applications
for each row execute function public.trg_application_accepted_init_internship();

-- --- RLS ------------------------------------------------------------------------
alter table public.internships enable row level security;
alter table public.internship_monthly_reports enable row level security;
alter table public.internship_weekly_reports enable row level security;
alter table public.internship_attendance enable row level security;
alter table public.internship_employer_evaluations enable row level security;
alter table public.internship_final_reports enable row level security;
alter table public.user_signatures enable row level security;

-- internships
drop policy if exists "internships_select_student" on public.internships;
create policy "internships_select_student"
on public.internships for select to authenticated
using (public.internship_student_user_id(id) = auth.uid());

drop policy if exists "internships_select_company" on public.internships;
create policy "internships_select_company"
on public.internships for select to authenticated
using (public.internship_company_user_id(id) = auth.uid());

drop policy if exists "internships_select_supervisor" on public.internships;
create policy "internships_select_supervisor"
on public.internships for select to authenticated
using (public.supervisor_can_access_internship(id));

drop policy if exists "internships_select_admin" on public.internships;
create policy "internships_select_admin"
on public.internships for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "internships_update_supervisor" on public.internships;
create policy "internships_update_supervisor"
on public.internships for update to authenticated
using (public.supervisor_can_access_internship(id))
with check (public.supervisor_can_access_internship(id));

-- monthly reports
drop policy if exists "imr_select_participants" on public.internship_monthly_reports;
create policy "imr_select_participants"
on public.internship_monthly_reports for select to authenticated
using (
  public.internship_student_user_id(internship_id) = auth.uid()
  or public.internship_company_user_id(internship_id) = auth.uid()
  or public.supervisor_can_access_internship(internship_id)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "imr_update_student" on public.internship_monthly_reports;
create policy "imr_update_student"
on public.internship_monthly_reports for update to authenticated
using (
  public.internship_student_user_id(internship_id) = auth.uid()
  and status in ('unlocked', 'overdue', 'rejected', 'pending_student')
  and public.previous_monthly_report_approved(internship_id, month_number)
)
with check (public.internship_student_user_id(internship_id) = auth.uid());

drop policy if exists "imr_update_company" on public.internship_monthly_reports;
create policy "imr_update_company"
on public.internship_monthly_reports for update to authenticated
using (
  public.internship_company_user_id(internship_id) = auth.uid()
  and status in ('pending_employer', 'overdue')
)
with check (public.internship_company_user_id(internship_id) = auth.uid());

drop policy if exists "imr_update_supervisor" on public.internship_monthly_reports;
create policy "imr_update_supervisor"
on public.internship_monthly_reports for update to authenticated
using (
  public.supervisor_can_access_internship(internship_id)
  and status = 'pending_supervisor'
)
with check (public.supervisor_can_access_internship(internship_id));

-- weekly reports
drop policy if exists "iwr_all_participants" on public.internship_weekly_reports;
create policy "iwr_select_participants"
on public.internship_weekly_reports for select to authenticated
using (
  exists (
    select 1 from public.internship_monthly_reports r
    where r.id = monthly_report_id
      and (
        public.internship_student_user_id(r.internship_id) = auth.uid()
        or public.internship_company_user_id(r.internship_id) = auth.uid()
        or public.supervisor_can_access_internship(r.internship_id)
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
  )
);

drop policy if exists "iwr_update_student" on public.internship_weekly_reports;
create policy "iwr_update_student"
on public.internship_weekly_reports for update to authenticated
using (
  exists (
    select 1 from public.internship_monthly_reports r
    where r.id = monthly_report_id
      and public.internship_student_user_id(r.internship_id) = auth.uid()
      and r.status in ('unlocked', 'overdue', 'rejected', 'pending_student')
  )
);

-- attendance
drop policy if exists "ia_select_participants" on public.internship_attendance;
create policy "ia_select_participants"
on public.internship_attendance for select to authenticated
using (
  public.internship_student_user_id(internship_id) = auth.uid()
  or public.internship_company_user_id(internship_id) = auth.uid()
  or public.supervisor_can_access_internship(internship_id)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "ia_update_company" on public.internship_attendance;
create policy "ia_update_company"
on public.internship_attendance for update to authenticated
using (public.internship_company_user_id(internship_id) = auth.uid())
with check (public.internship_company_user_id(internship_id) = auth.uid());

drop policy if exists "ia_insert_company" on public.internship_attendance;
create policy "ia_insert_company"
on public.internship_attendance for insert to authenticated
with check (public.internship_company_user_id(internship_id) = auth.uid());

-- employer evaluations
drop policy if exists "iee_select_participants" on public.internship_employer_evaluations;
create policy "iee_select_participants"
on public.internship_employer_evaluations for select to authenticated
using (
  exists (
    select 1 from public.internship_monthly_reports r
    where r.id = monthly_report_id
      and (
        public.internship_student_user_id(r.internship_id) = auth.uid()
        or public.internship_company_user_id(r.internship_id) = auth.uid()
        or public.supervisor_can_access_internship(r.internship_id)
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
  )
);

drop policy if exists "iee_insert_company" on public.internship_employer_evaluations;
create policy "iee_insert_company"
on public.internship_employer_evaluations for insert to authenticated
with check (
  exists (
    select 1 from public.internship_monthly_reports r
    where r.id = monthly_report_id
      and public.internship_company_user_id(r.internship_id) = auth.uid()
      and r.status in ('pending_employer', 'overdue')
  )
);

drop policy if exists "iee_update_company" on public.internship_employer_evaluations;
create policy "iee_update_company"
on public.internship_employer_evaluations for update to authenticated
using (
  exists (
    select 1 from public.internship_monthly_reports r
    where r.id = monthly_report_id
      and public.internship_company_user_id(r.internship_id) = auth.uid()
  )
);

-- final reports
drop policy if exists "ifr_select_participants" on public.internship_final_reports;
create policy "ifr_select_participants"
on public.internship_final_reports for select to authenticated
using (
  public.internship_student_user_id(internship_id) = auth.uid()
  or public.internship_company_user_id(internship_id) = auth.uid()
  or public.supervisor_can_access_internship(internship_id)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "ifr_insert_student" on public.internship_final_reports;
create policy "ifr_insert_student"
on public.internship_final_reports for insert to authenticated
with check (public.internship_student_user_id(internship_id) = auth.uid());

drop policy if exists "ifr_update_supervisor" on public.internship_final_reports;
create policy "ifr_update_supervisor"
on public.internship_final_reports for update to authenticated
using (public.supervisor_can_access_internship(internship_id))
with check (public.supervisor_can_access_internship(internship_id));

-- signatures
drop policy if exists "user_signatures_own" on public.user_signatures;
create policy "user_signatures_select_own"
on public.user_signatures for select to authenticated
using (user_id = auth.uid());

drop policy if exists "user_signatures_upsert_own" on public.user_signatures;
create policy "user_signatures_insert_own"
on public.user_signatures for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_signatures_update_own" on public.user_signatures;
create policy "user_signatures_update_own"
on public.user_signatures for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- --- Storage buckets ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('internship-report-pdfs', 'internship-report-pdfs', false, 10485760, array['application/pdf']),
  ('final-internship-reports', 'final-internship-reports', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- Storage RLS (student upload reports, participants read via signed URLs)
drop policy if exists "internship_report_pdfs_student_insert" on storage.objects;
create policy "internship_report_pdfs_student_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'internship-report-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "internship_report_pdfs_select_own" on storage.objects;
create policy "internship_report_pdfs_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'internship-report-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "final_reports_student_insert" on storage.objects;
create policy "final_reports_student_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'final-internship-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "final_reports_student_select" on storage.objects;
create policy "final_reports_student_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'final-internship-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);
