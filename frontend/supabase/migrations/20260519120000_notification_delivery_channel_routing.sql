-- Notification delivery routing: one preferred channel per user, enforced on INSERT.
-- Fixes: backfill must bypass delivery_channel guard trigger.

-- ---------------------------------------------------------------------------
-- 1) Preferred channel on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists preferred_delivery_channel text not null default 'in_app';

alter table public.profiles
  drop constraint if exists profiles_preferred_delivery_channel_check;

alter table public.profiles
  add constraint profiles_preferred_delivery_channel_check
  check (preferred_delivery_channel in ('in_app', 'email', 'sms', 'push'));

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'email_notifications'
  ) then
    update public.profiles
    set preferred_delivery_channel = case
      when coalesce(email_notifications, false) = true
        and coalesce(push_notifications, false) = false then 'email'
      when coalesce(email_notifications, false) = false
        and coalesce(push_notifications, false) = true then 'in_app'
      when coalesce(email_notifications, false) = false
        and coalesce(push_notifications, false) = false then 'in_app'
      else coalesce(nullif(trim(preferred_delivery_channel), ''), 'in_app')
    end;
  end if;
end;
$$;

create index if not exists idx_profiles_preferred_delivery_channel
  on public.profiles(preferred_delivery_channel);

-- ---------------------------------------------------------------------------
-- 2) delivery_channel on notifications
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column if not exists delivery_channel text not null default 'in_app';

alter table public.notifications
  drop constraint if exists notifications_delivery_channel_check;

alter table public.notifications
  add constraint notifications_delivery_channel_check
  check (delivery_channel in ('in_app', 'email', 'sms', 'push'));

create index if not exists idx_notifications_user_delivery_channel
  on public.notifications(user_id, delivery_channel);

-- ---------------------------------------------------------------------------
-- 3) Outbox (email / sms / push workers)
-- ---------------------------------------------------------------------------
create table if not exists public.notification_delivery_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivery_channel text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint notification_delivery_outbox_channel_check
    check (delivery_channel in ('email', 'sms', 'push')),
  constraint notification_delivery_outbox_status_check
    check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint notification_delivery_outbox_notification_channel_key
    unique (notification_id, delivery_channel)
);

create index if not exists idx_notification_delivery_outbox_pending
  on public.notification_delivery_outbox(status, created_at)
  where status = 'pending';

alter table public.notification_delivery_outbox enable row level security;

drop policy if exists "notification_delivery_outbox_select_own" on public.notification_delivery_outbox;
create policy "notification_delivery_outbox_select_own"
on public.notification_delivery_outbox
for select
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) Helpers & triggers
-- ---------------------------------------------------------------------------
create or replace function public.resolve_preferred_delivery_channel(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case coalesce(nullif(trim(p.preferred_delivery_channel), ''), 'in_app')
    when 'email' then 'email'
    when 'sms' then 'sms'
    when 'push' then 'push'
    else 'in_app'
  end
  from public.profiles p
  where p.id = p_user_id
  union all
  select 'in_app'
  where not exists (select 1 from public.profiles p where p.id = p_user_id)
  limit 1;
$$;

revoke all on function public.resolve_preferred_delivery_channel(uuid) from public;
grant execute on function public.resolve_preferred_delivery_channel(uuid) to authenticated, service_role;

create or replace function public.notifications_apply_delivery_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.delivery_channel := public.resolve_preferred_delivery_channel(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_notifications_apply_delivery_channel on public.notifications;
create trigger trg_notifications_apply_delivery_channel
before insert on public.notifications
for each row
execute function public.notifications_apply_delivery_channel();

create or replace function public.notifications_enqueue_external_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.delivery_channel in ('email', 'sms', 'push') then
    insert into public.notification_delivery_outbox (
      notification_id,
      user_id,
      delivery_channel,
      payload
    )
    values (
      new.id,
      new.user_id,
      new.delivery_channel,
      jsonb_build_object(
        'event_type', new.type,
        'title', new.title,
        'message', new.message,
        'related_application_id', new.related_application_id,
        'related_rating_id', new.related_rating_id,
        'related_conversation_id', new.related_conversation_id
      )
    )
    on conflict (notification_id, delivery_channel) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_enqueue_external_delivery on public.notifications;
create trigger trg_notifications_enqueue_external_delivery
after insert on public.notifications
for each row
execute function public.notifications_enqueue_external_delivery();

-- Allow migrations/backfills when session GUC is set; block app client overrides.
create or replace function public.notifications_prevent_delivery_channel_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.delivery_channel is distinct from old.delivery_channel
     and coalesce(current_setting('app.allow_delivery_channel_mutation', true), '') <> 'on'
  then
    raise exception 'delivery_channel is database-managed and cannot be updated'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_prevent_delivery_channel_mutation on public.notifications;
create trigger trg_notifications_prevent_delivery_channel_mutation
before update on public.notifications
for each row
execute function public.notifications_prevent_delivery_channel_mutation();

create or replace view public.notifications_in_app
with (security_invoker = true)
as
select
  n.id,
  n.user_id,
  n.title,
  n.message,
  n.type,
  n.is_read,
  n.related_application_id,
  n.related_rating_id,
  n.related_conversation_id,
  n.delivery_channel,
  n.created_at
from public.notifications n
where n.delivery_channel = 'in_app';

grant select on public.notifications_in_app to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Backfill (bypass guard for this transaction only)
-- ---------------------------------------------------------------------------
select set_config('app.allow_delivery_channel_mutation', 'on', true);

update public.notifications n
set delivery_channel = public.resolve_preferred_delivery_channel(n.user_id)
where n.delivery_channel is distinct from public.resolve_preferred_delivery_channel(n.user_id);

select set_config('app.allow_delivery_channel_mutation', 'off', true);

insert into public.notification_delivery_outbox (
  notification_id,
  user_id,
  delivery_channel,
  payload,
  status
)
select
  n.id,
  n.user_id,
  n.delivery_channel,
  jsonb_build_object(
    'event_type', n.type,
    'title', n.title,
    'message', n.message,
    'related_application_id', n.related_application_id,
    'related_rating_id', n.related_rating_id,
    'related_conversation_id', n.related_conversation_id
  ),
  'pending'
from public.notifications n
where n.delivery_channel in ('email', 'sms', 'push')
on conflict (notification_id, delivery_channel) do nothing;
