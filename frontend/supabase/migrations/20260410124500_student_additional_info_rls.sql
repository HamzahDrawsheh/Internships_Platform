-- RLS for student_additional_info: students can access only their own row.

alter table public.student_additional_info enable row level security;

drop policy if exists "student_additional_info_select_own" on public.student_additional_info;
create policy "student_additional_info_select_own"
on public.student_additional_info
for select
using (user_id = auth.uid());

drop policy if exists "student_additional_info_insert_own" on public.student_additional_info;
create policy "student_additional_info_insert_own"
on public.student_additional_info
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

drop policy if exists "student_additional_info_update_own" on public.student_additional_info;
create policy "student_additional_info_update_own"
on public.student_additional_info
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
