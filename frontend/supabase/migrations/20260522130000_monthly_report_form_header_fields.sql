-- Per-report JUST header fields (student-editable on Part I)

alter table public.internship_monthly_reports
  add column if not exists form_student_name text,
  add column if not exists form_student_id text,
  add column if not exists form_department text,
  add column if not exists form_employer_name text,
  add column if not exists form_university_supervisor text;
