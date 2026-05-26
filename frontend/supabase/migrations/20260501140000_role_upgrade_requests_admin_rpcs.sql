-- =========================================================
-- Role upgrade requests + admin approve/reject RPCs
-- Aligns with app: middleware, onboarding, admin/onboarding-requests
-- =========================================================

-- 1) Table
create table if not exists public.role_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_role text not null
    constraint role_upgrade_requests_requested_role_check
    check (requested_role in ('company', 'supervisor')),
  status text not null default 'pending'
    constraint role_upgrade_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  payload jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  admin_notes text
);

create index if not exists idx_role_upgrade_requests_user_id
  on public.role_upgrade_requests(user_id);

create index if not exists idx_role_upgrade_requests_status
  on public.role_upgrade_requests(status);

create index if not exists idx_role_upgrade_requests_requested_role
  on public.role_upgrade_requests(requested_role);

comment on table public.role_upgrade_requests is
  'Company/supervisor onboarding requests; profile.role updated only via admin RPCs.';

-- 2) updated_at (reuse project helper from full_schema)
drop trigger if exists trg_role_upgrade_requests_set_updated_at on public.role_upgrade_requests;

create trigger trg_role_upgrade_requests_set_updated_at
before update on public.role_upgrade_requests
for each row execute function public.set_updated_at();

-- 3) RLS
alter table public.role_upgrade_requests enable row level security;

drop policy if exists "role_upgrade_requests_select_own" on public.role_upgrade_requests;
create policy "role_upgrade_requests_select_own"
on public.role_upgrade_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "role_upgrade_requests_select_admin" on public.role_upgrade_requests;
create policy "role_upgrade_requests_select_admin"
on public.role_upgrade_requests
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "role_upgrade_requests_insert_own_pending" on public.role_upgrade_requests;
create policy "role_upgrade_requests_insert_own_pending"
on public.role_upgrade_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
);

drop policy if exists "role_upgrade_requests_update_own_pending" on public.role_upgrade_requests;
create policy "role_upgrade_requests_update_own_pending"
on public.role_upgrade_requests
for update
to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "role_upgrade_requests_update_admin" on public.role_upgrade_requests;
create policy "role_upgrade_requests_update_admin"
on public.role_upgrade_requests
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- 4) Approve (SECURITY DEFINER — bypasses RLS for transactional profile + request update)
drop function if exists public.approve_role_upgrade_request(uuid);

create or replace function public.approve_role_upgrade_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select *
  into r
  from public.role_upgrade_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0001';
  end if;

  if r.status is distinct from 'pending' then
    raise exception 'request is not pending' using errcode = 'P0001';
  end if;

  update public.profiles
  set
    role = r.requested_role,
    updated_at = now()
  where id = r.user_id;

  update public.role_upgrade_requests
  set
    status = 'approved',
    updated_at = now()
  where id = p_request_id;
end;
$$;

-- 5) Reject
drop function if exists public.reject_role_upgrade_request(uuid, text);

create or replace function public.reject_role_upgrade_request(
  p_request_id uuid,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if not public.is_admin_user() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select *
  into r
  from public.role_upgrade_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0001';
  end if;

  if r.status is distinct from 'pending' then
    raise exception 'request is not pending' using errcode = 'P0001';
  end if;

  update public.role_upgrade_requests
  set
    status = 'rejected',
    admin_notes = p_admin_notes,
    updated_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function public.approve_role_upgrade_request(uuid) from public;
revoke all on function public.reject_role_upgrade_request(uuid, text) from public;

grant execute on function public.approve_role_upgrade_request(uuid) to authenticated;
grant execute on function public.reject_role_upgrade_request(uuid, text) to authenticated;
