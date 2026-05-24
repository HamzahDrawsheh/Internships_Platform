-- Boolean notification settings on profiles (replaces legacy notification_preference text).
-- Idempotent: safe to run multiple times.

alter table public.profiles
  add column if not exists email_notifications boolean not null default true;

alter table public.profiles
  add column if not exists push_notifications boolean not null default true;

alter table public.profiles
  add column if not exists marketing_notifications boolean not null default false;

comment on column public.profiles.email_notifications is
  'Receive transactional/platform emails when supported.';
comment on column public.profiles.push_notifications is
  'Receive in-app (website) notifications.';
comment on column public.profiles.marketing_notifications is
  'Receive marketing and promotional emails.';

-- Migrate legacy notification_preference values when that column still exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'notification_preference'
  ) then
    update public.profiles
    set
      email_notifications = case
        when notification_preference in ('email', 'both') then true
        else false
      end,
      push_notifications = case
        when notification_preference in ('website', 'both') then true
        else false
      end,
      marketing_notifications = coalesce(marketing_notifications, false)
    where notification_preference is not null;

    -- Rows that never had legacy value: keep column defaults (true/true/false).
    alter table public.profiles
      drop constraint if exists profiles_notification_preference_check;

    alter table public.profiles
      drop column if exists notification_preference;
  end if;
end;
$$;

-- Backfill nulls if columns existed without NOT NULL (older partial installs).
update public.profiles
set
  email_notifications = coalesce(email_notifications, true),
  push_notifications = coalesce(push_notifications, true),
  marketing_notifications = coalesce(marketing_notifications, false)
where
  email_notifications is null
  or push_notifications is null
  or marketing_notifications is null;
