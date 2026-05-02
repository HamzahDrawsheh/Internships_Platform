-- Student CVs: storage path on students row + private bucket policies.
-- Stores only the object path inside bucket `student-cvs` (not public URLs).

alter table if exists public.students
  add column if not exists cv_path text;

comment on column public.students.cv_path is 'Path inside storage bucket student-cvs (e.g. students/<student_id>/cv.pdf).';

-- Private bucket for PDF CVs (access via signed URLs from API or student upload via RLS).
insert into storage.buckets (id, name, public)
values ('student-cvs', 'student-cvs', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "student_cvs_select_own" on storage.objects;
drop policy if exists "student_cvs_insert_own" on storage.objects;
drop policy if exists "student_cvs_update_own" on storage.objects;
drop policy if exists "student_cvs_delete_own" on storage.objects;

create policy "student_cvs_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-cvs'
  and split_part(name, '/', 1) = 'students'
  and split_part(name, '/', 3) = 'cv.pdf'
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(storage.objects.name, '/', 2)
      and s.user_id = auth.uid()
  )
);

create policy "student_cvs_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-cvs'
  and split_part(name, '/', 1) = 'students'
  and split_part(name, '/', 3) = 'cv.pdf'
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(storage.objects.name, '/', 2)
      and s.user_id = auth.uid()
  )
);

create policy "student_cvs_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'student-cvs'
  and split_part(name, '/', 1) = 'students'
  and split_part(name, '/', 3) = 'cv.pdf'
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(storage.objects.name, '/', 2)
      and s.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'student-cvs'
  and split_part(name, '/', 1) = 'students'
  and split_part(name, '/', 3) = 'cv.pdf'
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(storage.objects.name, '/', 2)
      and s.user_id = auth.uid()
  )
);

create policy "student_cvs_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-cvs'
  and split_part(name, '/', 1) = 'students'
  and split_part(name, '/', 3) = 'cv.pdf'
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(storage.objects.name, '/', 2)
      and s.user_id = auth.uid()
  )
);
