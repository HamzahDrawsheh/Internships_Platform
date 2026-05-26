-- =========================================================
-- Notifications alignment: accepted/rejected type compatibility
-- =========================================================
-- Keeps existing table, updates allowed type values for compatibility,
-- and aligns company insert policy with accepted/rejected values.

alter table if exists public.notifications
  drop constraint if exists notifications_type_check;

alter table if exists public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'accepted',
      'rejected',
      'application_accepted',
      'application_rejected',
      'info'
    )
  );

drop policy if exists "notifications_insert_company_application_status" on public.notifications;
create policy "notifications_insert_company_application_status"
on public.notifications
for insert
with check (
  related_application_id is not null
  and type in ('accepted', 'rejected', 'application_accepted', 'application_rejected')
  and public.company_can_notify_application_user(related_application_id, user_id)
);

