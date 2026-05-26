-- Per-user notification delivery preference (website / email / both).
-- Default: website only — existing in-app notifications unchanged.

alter table public.profiles
  add column if not exists notification_preference text not null default 'website';

alter table public.profiles
  drop constraint if exists profiles_notification_preference_check;

alter table public.profiles
  add constraint profiles_notification_preference_check
  check (notification_preference in ('website', 'email', 'both'));

comment on column public.profiles.notification_preference is
  'Where the user receives notifications: website (in-app), email, or both.';
