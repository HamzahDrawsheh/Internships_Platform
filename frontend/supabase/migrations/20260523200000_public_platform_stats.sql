-- Public landing page stats (anon cannot SELECT students/companies due to RLS).
create or replace function public.get_public_platform_stats()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'students', (select count(*)::int from public.students),
    'companies', (select count(*)::int from public.companies),
    'positions', (
      select count(*)::int
      from public.internship_positions
      where is_active = true
    )
  );
$$;

revoke all on function public.get_public_platform_stats() from public;
grant execute on function public.get_public_platform_stats() to anon, authenticated, service_role;
