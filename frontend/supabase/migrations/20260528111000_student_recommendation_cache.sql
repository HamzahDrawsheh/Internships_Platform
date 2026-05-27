-- Cache scored recommendations when pgvector ANN indexes are unavailable.

create table if not exists public.student_recommendation_cache (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  student_embedding_version text not null,
  location_prefs_key text not null default '',
  recommendations jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  unique (student_id, student_embedding_version, location_prefs_key)
);

create index if not exists idx_student_recommendation_cache_lookup
  on public.student_recommendation_cache(student_id, student_embedding_version, location_prefs_key, generated_at desc);

alter table public.student_recommendation_cache enable row level security;

drop policy if exists "student_recommendation_cache_deny_all" on public.student_recommendation_cache;
create policy "student_recommendation_cache_deny_all"
on public.student_recommendation_cache
for all
using (false)
with check (false);
