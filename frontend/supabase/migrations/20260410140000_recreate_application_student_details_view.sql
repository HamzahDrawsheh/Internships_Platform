-- Recreate view with corrected column layout and join path.
-- Uses students -> profiles bridge and LEFT JOIN for student_additional_info.

drop view if exists public.v_application_student_details;

create view public.v_application_student_details as
select
  a.id as application_id,
  s.id as student_id,
  p.id as student_user_id,
  p.full_name as student_name,
  p.email,
  s.university,
  s.major,
  coalesce((regexp_match(coalesce(s.preferences, ''), '"year"\s*:\s*"([^"]*)"'))[1], '—') as year,
  coalesce((regexp_match(coalesce(s.preferences, ''), '"bio"\s*:\s*"([^"]*)"'))[1], nullif(s.preferences, ''), '—') as bio,
  s.cv_url,
  ip.title as internship_title,
  a.applied_at,
  a.status as application_status,
  c.user_id as company_user_id,
  sup.user_id as supervisor_user_id,
  sai.gpa,
  sai.technical_skills,
  sai.taken_courses
from public.applications a
join public.students s
  on s.id = a.student_id
join public.profiles p
  on p.id = s.user_id
left join public.internship_positions ip
  on ip.id = a.position_id
left join public.companies c
  on c.id = ip.company_id
left join public.supervisors sup
  on sup.id = s.supervisor_id
left join public.student_additional_info sai
  on sai.user_id = p.id;
