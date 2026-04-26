-- Phase 3: student internship recommendations using vector similarity.
-- Returns top matches for a student embedding, excluding already-applied internships.

create or replace function public.get_student_recommended_internships(
  p_student_id uuid,
  p_limit integer default 8
)
returns table (
  internship_id uuid,
  title text,
  company_name text,
  similarity_score double precision,
  match_percentage numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with student_embedding as (
    select s.embedding
    from public.students s
    where s.id = p_student_id
      and public.owns_student_row(s.id)
      and s.embedding is not null
    limit 1
  )
  select
    pos.id as internship_id,
    pos.title,
    c.company_name,
    (1 - (pos.embedding <=> se.embedding)) as similarity_score,
    round(
      greatest(
        least(((1 - (pos.embedding <=> se.embedding)) * 100), 100),
        0
      )::numeric,
      2
    ) as match_percentage
  from student_embedding se
  join public.internship_positions pos
    on pos.embedding is not null
  join public.companies c
    on c.id = pos.company_id
  left join public.applications app
    on app.position_id = pos.id
   and app.student_id = p_student_id
  where pos.is_active = true
    and app.id is null
  order by (pos.embedding <=> se.embedding) asc
  limit greatest(coalesce(p_limit, 8), 1);
$$;

grant execute on function public.get_student_recommended_internships(uuid, integer) to authenticated;
grant execute on function public.get_student_recommended_internships(uuid, integer) to service_role;
