-- AI Task-to-Skill Mapper: evidence-based skills extracted from monthly internship reports

create table if not exists public.student_report_skills (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  report_id uuid not null references public.internship_monthly_reports(id) on delete cascade,
  skill_name text not null,
  skill_category text not null
    check (skill_category in ('technical', 'soft', 'tool', 'domain')),
  evidence_text text,
  confidence_score numeric,
  source text not null default 'ai_task_mapper',
  approved_by_student boolean not null default true,
  added_to_cv boolean not null default false,
  approved_by_supervisor boolean not null default false,
  created_at timestamptz not null default now(),
  constraint student_report_skills_confidence_range
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1))
);

create unique index if not exists idx_student_report_skills_unique_skill
  on public.student_report_skills (student_id, report_id, lower(trim(skill_name)));

create index if not exists idx_student_report_skills_student_id
  on public.student_report_skills (student_id);

create index if not exists idx_student_report_skills_report_id
  on public.student_report_skills (report_id);

create index if not exists idx_student_report_skills_skill_name_lower
  on public.student_report_skills (lower(skill_name));

create index if not exists idx_student_report_skills_added_to_cv
  on public.student_report_skills (added_to_cv);

create index if not exists idx_student_report_skills_supervisor_approved
  on public.student_report_skills (approved_by_supervisor);

alter table public.student_report_skills enable row level security;

-- Students: own rows only
drop policy if exists "srs_select_own" on public.student_report_skills;
create policy "srs_select_own"
on public.student_report_skills for select to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);

drop policy if exists "srs_insert_own" on public.student_report_skills;
create policy "srs_insert_own"
on public.student_report_skills for insert to authenticated
with check (
  exists (
    select 1 from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.internship_monthly_reports r
    join public.internships i on i.id = r.internship_id
    where r.id = report_id
      and i.student_id = student_report_skills.student_id
  )
);

drop policy if exists "srs_update_own" on public.student_report_skills;
create policy "srs_update_own"
on public.student_report_skills for update to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);

drop policy if exists "srs_delete_own" on public.student_report_skills;
create policy "srs_delete_own"
on public.student_report_skills for delete to authenticated
using (
  exists (
    select 1 from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);

-- Company / supervisor / admin: read when they can read the monthly report
drop policy if exists "srs_select_report_participants" on public.student_report_skills;
create policy "srs_select_report_participants"
on public.student_report_skills for select to authenticated
using (
  exists (
    select 1 from public.internship_monthly_reports r
    where r.id = report_id
      and (
        public.internship_student_user_id(r.internship_id) = auth.uid()
        or public.internship_company_user_id(r.internship_id) = auth.uid()
        or public.supervisor_can_access_internship(r.internship_id)
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
  )
);

grant select, insert, update, delete on public.student_report_skills to authenticated;
