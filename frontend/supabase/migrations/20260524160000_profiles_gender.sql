-- Student profile gender for avatar personalization (male / female).

alter table public.profiles
  add column if not exists gender text;

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('male', 'female'));

comment on column public.profiles.gender is 'Optional student gender for profile avatar (male | female).';
