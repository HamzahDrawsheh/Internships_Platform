-- Add custom courses field for student additional information.
alter table public.student_additional_info
add column if not exists custom_courses text[] null default '{}';
