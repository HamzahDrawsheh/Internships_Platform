-- Students with a confirmed placement (accepted application) cannot apply to new internships.

drop policy if exists "applications_insert_student_only" on public.applications;

create policy "applications_insert_student_only"
on public.applications
for insert
to authenticated
with check (
  public.owns_student_row(applications.student_id)
  and public.is_student_user()
  and not public.student_has_committed_internship(applications.student_id)
);
