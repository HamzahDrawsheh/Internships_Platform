-- Add idempotency hooks for notification/email delivery paths.

alter table if exists public.transactional_email_queue
  add column if not exists idempotency_key text;

create unique index if not exists idx_transactional_email_queue_idempotency_key
  on public.transactional_email_queue(idempotency_key)
  where idempotency_key is not null;

alter table if exists public.notifications
  add column if not exists idempotency_key text;

create unique index if not exists idx_notifications_idempotency_key
  on public.notifications(idempotency_key)
  where idempotency_key is not null;
