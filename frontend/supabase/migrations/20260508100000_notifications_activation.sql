-- =========================================================
-- Notifications: expand types, student→company inserts, listing closed
-- =========================================================

alter table public.notifications
  add column if not exists related_rating_id uuid references public.ratings(id) on delete set null;

create index if not exists idx_notifications_related_rating_id
  on public.notifications(related_rating_id);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'accepted',
      'rejected',
      'application_accepted',
      'application_rejected',
      'info',
      'training_completed',
      'application_expired',
      'new_application',
      'new_feedback',
      'new_training_evaluation'
    )
  );

-- Student submitted application → notify company owner (recipient user_id = companies.user_id)
create or replace function public.student_can_notify_company_new_application(
  application_row_id uuid,
  target_company_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications app
    join public.students s on s.id = app.student_id
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where app.id = application_row_id
      and s.user_id = auth.uid()
      and c.user_id = target_company_user_id
  );
$$;

-- Student submitted star rating → notify company
create or replace function public.student_can_notify_company_rating(
  rating_row_id uuid,
  target_company_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ratings r
    join public.students s on s.id = r.student_id
    join public.companies c on c.id = r.company_id
    where r.id = rating_row_id
      and s.user_id = auth.uid()
      and c.user_id = target_company_user_id
  );
$$;

-- Student submitted training evaluation → notify company (related_application_id)
create or replace function public.student_can_notify_company_training_evaluation(
  p_application_id uuid,
  target_company_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_training_evaluations ste
    join public.applications app on app.id = ste.application_id
    join public.students s on s.id = app.student_id
    join public.internship_positions pos on pos.id = app.position_id
    join public.companies c on c.id = pos.company_id
    where ste.application_id = p_application_id
      and s.user_id = auth.uid()
      and c.user_id = target_company_user_id
  );
$$;

drop policy if exists "notifications_insert_company_application_status" on public.notifications;
create policy "notifications_insert_company_application_status"
on public.notifications for insert
with check (
  related_application_id is not null
  and type in (
    'accepted',
    'rejected',
    'application_accepted',
    'application_rejected',
    'training_completed',
    'application_expired'
  )
  and public.company_can_notify_application_user(related_application_id, user_id)
);

drop policy if exists "notifications_insert_student_new_application" on public.notifications;
create policy "notifications_insert_student_new_application"
on public.notifications for insert
with check (
  type = 'new_application'
  and related_application_id is not null
  and public.student_can_notify_company_new_application(related_application_id, user_id)
);

drop policy if exists "notifications_insert_student_new_feedback" on public.notifications;
create policy "notifications_insert_student_new_feedback"
on public.notifications for insert
with check (
  type = 'new_feedback'
  and related_rating_id is not null
  and public.student_can_notify_company_rating(related_rating_id, user_id)
);

drop policy if exists "notifications_insert_student_training_evaluation_notice" on public.notifications;
create policy "notifications_insert_student_training_evaluation_notice"
on public.notifications for insert
with check (
  type = 'new_training_evaluation'
  and related_application_id is not null
  and public.student_can_notify_company_training_evaluation(related_application_id, user_id)
);
