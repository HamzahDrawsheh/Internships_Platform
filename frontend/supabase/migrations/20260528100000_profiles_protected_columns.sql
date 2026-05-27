-- Prevent self-escalation through broad profiles_update_own policies.
-- Normal users may edit safe profile fields, but only admins/service role may
-- change authorization-sensitive columns.

create or replace function public.prevent_profile_protected_column_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin_user() then
    return new;
  end if;

  if old.role is distinct from new.role then
    raise exception 'role cannot be changed by this user' using errcode = '42501';
  end if;

  if old.is_suspended is distinct from new.is_suspended then
    raise exception 'suspension status cannot be changed by this user' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_protected_column_update on public.profiles;

create trigger trg_profiles_prevent_protected_column_update
before update on public.profiles
for each row execute function public.prevent_profile_protected_column_update();

revoke all on function public.prevent_profile_protected_column_update() from public;
