-- public.feedback_analysis: RLS + SELECT (student owns row via evaluation link; admin reads all).

-- 1) Enable RLS
alter table public.feedback_analysis enable row level security;

-- 2) Drop prior policies if present
drop policy if exists "feedback_analysis_select_own_student" on public.feedback_analysis;
drop policy if exists "feedback_analysis_select_admin" on public.feedback_analysis;

-- 3) Student: SELECT own rows only (feedback links to their student_training_evaluations)
create policy "feedback_analysis_select_own_student"
on public.feedback_analysis
for select
to authenticated
using (
  exists (
    select 1
    from public.student_training_evaluations ste
    join public.students s on s.id = ste.student_id
    where ste.id = feedback_analysis.feedback_id
      and s.user_id = auth.uid()
  )
);

-- 4) Admin: SELECT all
create policy "feedback_analysis_select_admin"
on public.feedback_analysis
for select
to authenticated
using (public.is_admin_user());
