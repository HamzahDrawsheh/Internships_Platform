-- =========================================================
-- Phase 1: Add completed application status + training evaluations
-- =========================================================

-- 1) Extend applications.status to include 'completed'
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'accepted', 'rejected', 'completed'));

-- 2) Create student training evaluations table
create table if not exists public.student_training_evaluations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  overall_rating integer not null check (overall_rating between 1 and 5),
  mentorship_rating integer not null check (mentorship_rating between 1 and 5),
  environment_rating integer not null check (environment_rating between 1 and 5),
  skills_rating integer not null check (skills_rating between 1 and 5),
  would_recommend boolean not null,
  other_notes text,
  created_at timestamptz not null default now(),
  constraint student_training_evaluations_application_id_key unique (application_id)
);

create index if not exists idx_student_training_evaluations_student_id
  on public.student_training_evaluations(student_id);

-- 3) Enable RLS
alter table public.student_training_evaluations enable row level security;

-- 4) RLS policies
-- Student can select only own evaluations.
drop policy if exists "student_training_evaluations_select_own" on public.student_training_evaluations;
create policy "student_training_evaluations_select_own"
on public.student_training_evaluations
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_training_evaluations.student_id
      and s.user_id = auth.uid()
  )
);

-- Student can insert only if:
-- - the target student_id belongs to auth user
-- - the application belongs to the same student
-- - application status is 'completed'
drop policy if exists "student_training_evaluations_insert_own_completed_application" on public.student_training_evaluations;
create policy "student_training_evaluations_insert_own_completed_application"
on public.student_training_evaluations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    join public.applications a
      on a.student_id = s.id
     and a.id = student_training_evaluations.application_id
    where s.id = student_training_evaluations.student_id
      and s.user_id = auth.uid()
      and a.status = 'completed'
  )
);

-- Intentionally no update/delete policies for this table.
