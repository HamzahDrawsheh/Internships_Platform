-- =========================================================
-- Base table: public.student_additional_info (late timestamp for migration-history safety).
-- CREATE IF NOT EXISTS is safe if the table already exists on remote.
-- PK constraint name matches later unique-constraint migrations so they no-op safely.
-- =========================================================

create table if not exists public.student_additional_info (
  user_id uuid not null references public.profiles(id) on delete cascade,
  gpa numeric null,
  technical_skills text[] null default '{}'::text[],
  soft_skills text[] null default '{}'::text[],
  taken_courses text[] null default '{}'::text[],
  preferred_roles text[] null default '{}'::text[],
  preferred_locations text[] null default '{}'::text[],
  availability text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- App expects these scalars (profile upsert, embeddings); no later migration adds them.
  preferred_field text null,
  preferred_work_type text null,
  preferred_location text null,
  constraint student_additional_info_user_id_key primary key (user_id)
);

comment on table public.student_additional_info is
  'Extended student attributes keyed by profile user_id; RLS enabled in later migrations.';

drop trigger if exists trg_student_additional_info_set_updated_at on public.student_additional_info;

create trigger trg_student_additional_info_set_updated_at
before update on public.student_additional_info
for each row execute function public.set_updated_at();
