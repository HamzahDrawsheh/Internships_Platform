-- =========================================================
-- Students can browse public company listings
-- =========================================================
-- Minimal additive RLS policy so student users can read companies table
-- rows for the Browse Companies page.

alter table if exists public.companies enable row level security;

drop policy if exists "companies_select_student_browse" on public.companies;
create policy "companies_select_student_browse"
on public.companies
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
  )
);

