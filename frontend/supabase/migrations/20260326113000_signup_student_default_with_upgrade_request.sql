-- =========================================================
-- Signup safety: force profile.role = student on auth signup
-- and create pending onboarding requests for company/supervisor intent.
--
-- Notes:
-- - This keeps privileged role assignment out of signup.
-- - requested_role intent continues to come from auth metadata and is
--   persisted in role_upgrade_requests when the table exists.
-- =========================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_role text;
begin
  v_requested_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'student'));
  if v_requested_role not in ('company', 'supervisor') then
    v_requested_role := 'student';
  end if;

  -- Always create profile as student. Role upgrades happen only via admin flow.
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'student'
  )
  on conflict (id) do nothing;

  -- Persist onboarding intent as pending request, if this table is present.
  if v_requested_role in ('company', 'supervisor')
     and to_regclass('public.role_upgrade_requests') is not null then
    insert into public.role_upgrade_requests (user_id, requested_role, status, payload)
    select
      new.id,
      v_requested_role,
      'pending',
      '{}'::jsonb
    where not exists (
      select 1
      from public.role_upgrade_requests rur
      where rur.user_id = new.id
        and rur.requested_role = v_requested_role
        and rur.status = 'pending'
    );
  end if;

  return new;
end;
$$;

