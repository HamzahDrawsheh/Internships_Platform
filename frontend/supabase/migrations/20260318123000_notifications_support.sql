-- =========================================================
-- Notifications support for application status updates
-- =========================================================
-- Adds DB-backed notifications with minimal RLS:
-- - users can read/update only their own notifications
-- - companies can insert notifications only for students who applied
--   to internships owned by that company (by related_application_id)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('application_accepted', 'application_rejected', 'info')),
  is_read boolean not null default false,
  related_application_id uuid references public.applications(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_related_application_id on public.notifications(related_application_id);

alter table if exists public.notifications enable row level security;

create or replace function public.company_can_notify_application_user(
  application_row_id uuid,
  target_user_id uuid
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
      and s.user_id = target_user_id
      and c.user_id = auth.uid()
  );
$$;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications_insert_company_application_status" on public.notifications;
create policy "notifications_insert_company_application_status"
on public.notifications
for insert
with check (
  related_application_id is not null
  and type in ('application_accepted', 'application_rejected')
  and public.company_can_notify_application_user(related_application_id, user_id)
);

drop policy if exists "notifications_insert_admin_info" on public.notifications;
create policy "notifications_insert_admin_info"
on public.notifications
for insert
with check (
  type = 'info'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

