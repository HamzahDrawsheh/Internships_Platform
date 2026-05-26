-- Additional student data for future AI recommendations.
-- Additive-only change: does not modify existing tables/columns.

create table if not exists public.student_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  taken_courses text[] null default '{}',
  gpa numeric(3,2) null check (gpa >= 0 and gpa <= 4.00),
  technical_skills text[] null default '{}',
  soft_skills text[] null default '{}',
  preferred_field text null,
  preferred_work_type text null check (preferred_work_type in ('remote', 'onsite', 'hybrid')),
  preferred_location text null,
  availability text null check (availability in ('part-time', 'full-time')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_student_preferences_set_updated_at on public.student_preferences;
create trigger trg_student_preferences_set_updated_at
before update on public.student_preferences
for each row execute function public.set_updated_at();

alter table public.student_preferences enable row level security;

drop policy if exists "student_preferences_select_own" on public.student_preferences;
create policy "student_preferences_select_own"
on public.student_preferences
for select
using (user_id = auth.uid());

drop policy if exists "student_preferences_insert_own" on public.student_preferences;
create policy "student_preferences_insert_own"
on public.student_preferences
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
  )
);

drop policy if exists "student_preferences_update_own" on public.student_preferences;
create policy "student_preferences_update_own"
on public.student_preferences
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
